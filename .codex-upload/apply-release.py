"""Reconstruct a checked release on a review branch; never writes main."""
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile

payload = Path(__file__).resolve().parent
target = Path(sys.argv[1]).resolve()
meta = json.loads((payload / 'manifest.json').read_text())

def git(*args):
    return subprocess.check_output(['git', *args], cwd=target, text=True).strip()

assert git('rev-parse', 'HEAD') == meta['parent'], 'Unexpected checkout'
assert git('ls-remote', 'origin', 'refs/heads/main').split()[0] == meta['parent'], 'Main changed; review before publishing'
assert not git('status', '--porcelain'), 'Checkout is not clean'
encoded = ''.join((payload / name).read_text().strip() for name in meta['parts'])
data = base64.b64decode(encoded, validate=True)
assert hashlib.sha256(data).hexdigest() == meta['archive_sha256'], 'Archive integrity mismatch'

with zipfile.ZipFile(io.BytesIO(data)) as archive:
    names = archive.namelist()
    assert len(names) == len(set(names))
    assert set(names) == set(meta['files']), 'Manifest mismatch'
    assert sum(item.file_size for item in archive.infolist()) < 100 * 1024 * 1024
    for name in names:
        relative = PurePosixPath(name)
        assert not relative.is_absolute() and '..' not in relative.parts
        assert relative.parts[0] not in ('.git', '.github', '.codex-upload')
        content = archive.read(name)
        assert hashlib.sha256(content).hexdigest() == meta['files'][name], name
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        destination.chmod(0o644)

subprocess.run(['git', 'add', '--', *names], cwd=target, check=True)
assert git('write-tree') == meta['tree'], 'Reconstructed tree differs from validated release'
subprocess.run(['git', '-c', 'user.name=github-actions[bot]',
                '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
                'commit', '-m', 'Integrate Divas Video v39 with private manual library'],
               cwd=target, check=True)
subprocess.run(['git', 'push', 'origin', 'HEAD:refs/heads/' + meta['ready_branch']],
               cwd=target, check=True)
print('Ready for verified publication:', git('rev-parse', 'HEAD'))

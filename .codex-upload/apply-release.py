from pathlib import Path
import hashlib,json,subprocess,sys
payload=Path(__file__).resolve().parent
target=Path(sys.argv[1]).resolve()
meta=json.loads((payload/'manifest.json').read_text())
def git(*args):return subprocess.check_output(['git',*args],cwd=target,text=True).strip()
assert git('rev-parse','HEAD')==meta['parent']
assert git('ls-remote','origin','refs/heads/main').split()[0]==meta['parent']
assert not git('status','--porcelain')
patch=payload/'changes.patch'
assert hashlib.sha256(patch.read_bytes()).hexdigest()==meta['sha256']
subprocess.run(['git','apply','--check','--unidiff-zero',str(patch)],cwd=target,check=True)
subprocess.run(['git','apply','--index','--unidiff-zero',str(patch)],cwd=target,check=True)
assert git('write-tree')==meta['tree']
subprocess.run(['git','diff','--cached','--check'],cwd=target,check=True)
subprocess.run(['git','-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Divas v45: give mobile video a large preview and intentional contextual controls'],cwd=target,check=True)
subprocess.run(['git','push','origin','HEAD:refs/heads/'+meta['ready_branch']],cwd=target,check=True)
print('Verified release:',git('rev-parse','HEAD'),meta['tree'])

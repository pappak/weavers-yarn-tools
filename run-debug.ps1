$env:WYT_DEBUG = '1'
node 'C:\Users\eldon\Workspace\weavers-yarn-tools\detect-photos.mjs' 2>&1 | Select-Object -First 8

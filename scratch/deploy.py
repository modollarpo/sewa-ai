import os

with open('azure/k8s/ai-services-deployment-prod.yaml', 'r') as f:
    content = f.read()

content = content.replace('{{IMAGE_TAG}}', 'production-latest')
content = content.replace('{{CONTAINER_REGISTRY}}', 'sewaaiproductionacr.azurecr.io')

with open('temp.yaml', 'w') as f:
    f.write(content)

os.system('kubectl apply -f temp.yaml')

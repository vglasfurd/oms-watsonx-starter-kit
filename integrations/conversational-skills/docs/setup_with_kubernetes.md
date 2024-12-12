# Setting up the skill provider on a K8s cluster

## Prerequisities

- A kubernetes cluster with a public ALB or ingress that is accessible from WatsonX assistant
- [kubectl](https://kubernetes.io/docs/reference/kubectl/) CLI
- [Helm](https://helm.sh/docs/intro/install/) CLI
- docker CLI or equivalent
- OpenShift CLI (oc) if you are using a RHOCP cluster

## Installation

1. Build the docker image using `./docker-build.sh` and publish the image to the container registry that the k8s cluster can pull from.

2. Switch to the namespace where you would want to install the helm chart.
```bash
#k8s
kubectl config set-context --current --namespace=NAMESPACE_NAME

#OpenShift CLI
oc project NAMESPACE_NAME
```

3. (One time action) Setup the `image-pull-secret` with the docker registry credentials for the helm chart to be able to deploy the pods.  
```bash
# k8s
kubectl create secret docker-registry image-pull-secret --docker-server=DOCKER_REGISTRY_SERVER --docker-username=DOCKER_USER --docker-password=DOCKER_PASSWORD --docker-email=DOCKER_EMAIL

# OpenShift CLI
oc create secret docker-registry image-pull-secret --docker-server=DOCKER_REGISTRY_SERVER --docker-username=DOCKER_USER --docker-password=DOCKER_PASSWORD --docker-email=DOCKER_EMAIL
```

4. (RHOCP One Time action) Create a new security context for the container to use same `USER` that the image was built with. This step is **only required** when running the POD in development mode.
```bash
oc create serviceaccount runasanyuid
oc adm policy add-scc-to-user nonroot -z runasanyuid --as system:admin
oc adm policy add-scc-to-user anyuid -z runasanyuid --as system:admin
```

5. Create the `.env` file under `deployment/oms-conversational-skills/config` directory. Refer to `Skill provider server configuration` in the [env.template](/env.template) for creating one. Helm has a restriction about accessing files outside of the chart directory and cannot read the file at the root of the repository.

6. Install the Helm chart:  
```bash
cd deployment/oms-conversational-skills
# Add --dry-run --debug if you wannt to debug or do a dry-run
# Add -f overrides.yaml if you want to override the default values in common-values.yaml
helm install CHART_NAME . -n NAMESPACE -f common-values.yaml
```

If you wish to upgrade the Helm chart,  
```bash
cd deployment/oms-conversational-skills
# Add --dry-run --debug if you wannt to debug or do a dry-run
# Add -f overrides.yaml if you want to override the default values in common-values.yaml
helm upgrade CHART_NAME . -n NAMESPACE -f common-values.yaml
```

7. Test your deployment by accessing `https://<ingress or route host name>/api` in a browser. This should load the Swagger UI of the skill provider server. You can get the ingress host name using the following steps:

```bash
export CHART_NAME=""
#k8s
kubectl get ingress -l "app.kubernetes.io/instance=$CHART_NAME" -o jsonpath='{.items[0].spec.tls[0].hosts[0]}'

#RHOCP
oc get route -l "app.kubernetes.io/instance=$CHART_NAME" -o jsonpath='{.items[0].spec.host}'
```

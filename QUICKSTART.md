# Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Access to an OpenShift/Kubernetes cluster (optional for demo)

### Quick Setup

1. **Install and run:**
```bash
npm install
npm run build
npm start
```

2. **Or use the startup script:**
```bash
./start.sh
```

3. **Open your browser:**
   - Dashboard: http://localhost:3000/dashboard
   - API: http://localhost:3000/api/openshift/health

## 🔧 Configuration

### Environment Variables
```bash
# Copy and edit environment file
cp .env .env.local

# Key settings:
OPENSHIFT_NAMESPACES=default,myproject,staging
PORT=3000
KUBECONFIG=/path/to/your/kubeconfig
```

### Kubernetes Connection

#### Option 1: Local Development
```bash
# Set your kubeconfig path
export KUBECONFIG=/path/to/your/kubeconfig
npm start
```

#### Option 2: Default kubeconfig
```bash
# Ensure kubeconfig is at default location
ls ~/.kube/config
npm start
```

#### Option 3: Inside Cluster
When deployed inside OpenShift/Kubernetes, the app will automatically use the service account token.

## 🐳 Docker Deployment

### Quick Docker Run
```bash
# Build image
docker build -t openshift-pod-monitor .

# Run with your kubeconfig
docker run -d \
  --name pod-monitor \
  -p 3000:3000 \
  -v ~/.kube/config:/home/nestjs/.kube/config:ro \
  -e OPENSHIFT_NAMESPACES="default,myproject" \
  openshift-pod-monitor
```

### Docker Compose
```bash
# Edit docker-compose.yml if needed
docker-compose up -d
```

## ☸️ Kubernetes Deployment

```bash
# Apply all resources
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=openshift-pod-monitor

# Get route (OpenShift) or create port-forward
kubectl port-forward service/openshift-pod-monitor 3000:3000
```

## 🔒 Required Permissions

Your user/service account needs:
- `get`, `list`, `watch` pods
- `get`, `list`, `patch` deployments  
- `delete` pods (for restart)

Example RBAC (already included in k8s/deployment.yaml):
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-monitor-reader
rules:
- apiGroups: [""]
  resources: ["pods", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["delete"]
```

## ⚡ Features

- **Real-time monitoring** - Live pod status updates every 5 seconds
- **Bulk operations** - Start/stop/restart all pods in a namespace
- **WebSocket updates** - No page refresh needed
- **Modern UI** - Responsive design with Vue.js
- **Health monitoring** - Connection status indicators
- **Multi-namespace** - Monitor multiple namespaces simultaneously

## 🔧 Troubleshooting

### "Not connected to cluster"
1. Check if kubeconfig exists and is valid
2. Test connection: `kubectl cluster-info`
3. Verify RBAC permissions

### "No pods showing"
1. Check if namespaces exist: `kubectl get ns`
2. Verify namespace configuration in OPENSHIFT_NAMESPACES
3. Check pod permissions: `kubectl get pods -n <namespace>`

### Port conflicts
```bash
# Use different port
PORT=8080 npm start
```

## 📚 API Endpoints

- `GET /api/openshift/health` - Health check
- `GET /api/openshift/pods` - All pods
- `GET /api/openshift/stats` - Statistics
- `POST /api/openshift/action/start/:namespace` - Start namespace
- `POST /api/openshift/action/stop/:namespace` - Stop namespace

## 🎯 What It Does

1. **Monitors pods** across configured namespaces
2. **Shows statistics**: total, running, pending, failed pods
3. **Control pods**: 
   - Start = Scale up deployments to 1+ replicas
   - Stop = Scale down deployments to 0 replicas  
   - Restart = Delete pods (controllers recreate them)
4. **Real-time updates** via WebSockets
5. **Responsive UI** that works on mobile and desktop

---

🎉 **Your OpenShift Pod Monitor is ready!** 

Access the dashboard at: http://localhost:3000/dashboard
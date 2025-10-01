# NEST - Namespace Execution and Status Tool

A real-time web application for monitoring and controlling OpenShift/Kubernetes pods across multiple namespaces. Built with NestJS, WebSockets, and Vue.js for live updates and responsive UI. NEST provides comprehensive namespace management with both individual and bulk operations.

## 🚀 Features

- **Real-time Pod Monitoring**: Live status updates of pods across multiple namespaces
- **Interactive Dashboard**: Modern web interface with statistics and visual indicators
- **Pod Control**: Start, stop, and restart pods/deployments directly from the web interface
- **Bulk Operations**: Execute actions on multiple namespaces simultaneously
- **Multi-Namespace Support**: Monitor multiple namespaces simultaneously
- **WebSocket Integration**: Real-time updates without page refreshes
- **Responsive Design**: Works on desktop and mobile devices
- **Health Monitoring**: Connection status and cluster health indicators
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- Access to an OpenShift/Kubernetes cluster
- Valid kubeconfig file or service account with appropriate permissions

### Required Kubernetes Permissions

Your user/service account needs the following permissions:
- `get`, `list`, `watch` pods in target namespaces
- `get`, `list`, `patch` deployments for start/stop operations
- `delete` pods for restart operations

## 🛠️ Installation

### Option 1: Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd nest
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env to set your target namespaces
```

3. **Ensure kubeconfig access:**
```bash
# Make sure your kubeconfig is accessible
export KUBECONFIG=/path/to/your/kubeconfig
# Or place it in the default location: ~/.kube/config
```

4. **Start the application:**
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Option 2: Docker Deployment

1. **Using Docker Compose (Recommended):**
```bash
# Ensure your kubeconfig is at ~/.kube/config
docker-compose up -d
```

2. **Using Docker directly:**
```bash
docker build -t openshift-pod-monitor .
docker run -d \
  --name pod-monitor \
  -p 3000:3000 \
  -v ~/.kube/config:/home/nestjs/.kube/config:ro \
  -e OPENSHIFT_NAMESPACES="default,myproject,monitoring" \
  openshift-pod-monitor
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENSHIFT_NAMESPACES` | Comma-separated list of namespaces to monitor | `default,kube-system,openshift-console,openshift-monitoring` |
| `PORT` | Application port | `3000` |
| `KUBECONFIG` | Path to kubeconfig file | System default |
| `REFRESH_INTERVAL` | Pod status refresh interval (ms) | `5000` |
| `NODE_ENV` | Environment mode | `development` |

### Namespace Configuration

Edit the `OPENSHIFT_NAMESPACES` environment variable to specify which namespaces to monitor:

```bash
OPENSHIFT_NAMESPACES=default,myproject,staging,production,monitoring
```

## 🖥️ Usage

1. **Access the Dashboard:**
   - Open your browser to `http://localhost:3000`
   - The dashboard will automatically redirect to `/dashboard`

2. **Monitor Pods:**
   - View real-time pod status across all configured namespaces
   - See statistics: total, running, pending, and failed pods
   - Monitor individual pod details including restarts, age, and node assignment

3. **Control Pods:**
   - **Start**: Scale up deployments in a namespace (scale to 1+ replicas)
   - **Stop**: Scale down deployments in a namespace (scale to 0 replicas)
   - **Restart**: Delete pods to trigger recreation by controllers

4. **Real-time Updates:**
   - Pod status updates automatically every 5 seconds
   - Action results are broadcast to all connected clients
   - Connection status indicator shows cluster connectivity

## 📚 API Endpoints

### REST API

- `GET /api/openshift/pods` - Get all pods
- `GET /api/openshift/pods/:namespace` - Get pods by namespace
- `GET /api/openshift/stats` - Get monitoring statistics
- `GET /api/openshift/namespaces` - Get configured namespaces
- `POST /api/openshift/action` - Execute pod action
- `POST /api/openshift/action/start/:namespace` - Start namespace pods
- `POST /api/openshift/action/stop/:namespace` - Stop namespace pods
- `POST /api/openshift/action/restart/:namespace` - Restart namespace pods
- `GET /api/openshift/health` - Health check endpoint

### WebSocket Events

- `pods-update` - Real-time pod status updates
- `action-result` - Action execution results
- `notification` - System notifications
- `execute-action` - Execute pod actions
- `get-pods` - Request current pod data

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Web Browser   │◄──►│   NestJS API    │◄──►│ Kubernetes API   │
│   (Vue.js UI)   │    │   (WebSocket)   │    │    Server        │
└─────────────────┘    └─────────────────┘    └──────────────────┘
```

### Components

- **Frontend**: Vue.js 3 with Socket.io client for real-time updates
- **Backend**: NestJS with WebSocket gateway and REST API
- **Kubernetes Integration**: Official Kubernetes JavaScript client
- **Real-time Communication**: Socket.io for bidirectional communication

## 🔒 Security Considerations

- The application requires appropriate Kubernetes RBAC permissions
- Consider running with a service account with minimal required permissions
- In production, implement authentication and authorization
- Use HTTPS in production environments
- Validate and sanitize all user inputs

## 🚨 Troubleshooting

### Common Issues

1. **"Not connected to OpenShift cluster"**
   - Check kubeconfig file location and permissions
   - Verify cluster connectivity: `kubectl cluster-info`
   - Ensure proper RBAC permissions

2. **"Failed to fetch pods"**
   - Verify namespace exists and you have access
   - Check if namespaces are correctly configured in environment

3. **Actions not working**
   - Ensure you have `patch` permissions for deployments
   - Verify the namespace contains deployments (not just standalone pods)

4. **No pods showing**
   - Check if the specified namespaces exist
   - Verify pod list permissions: `kubectl get pods -n <namespace>`

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run start:dev
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Kubernetes JavaScript Client](https://github.com/kubernetes-client/javascript) - Official Kubernetes client
- [Socket.io](https://socket.io/) - Real-time communication
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework

---

## 📊 Screenshots

The dashboard provides:
- Real-time pod statistics with visual indicators
- Namespace-based controls for bulk operations
- Detailed pod information cards
- Connection status and health monitoring
- Responsive design for mobile and desktop

# OpenShift Pod Monitor - Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🌐 Web Browser (Client)                               │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   Dashboard     │    │   Statistics    │    │   Controls      │            │
│  │   (Vue.js 3)    │    │   Cards         │    │   (Start/Stop)  │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
│                    ⚡ Socket.io WebSocket Connection                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     🚀 NestJS Application Server                                │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  WebSocket      │    │  REST API       │    │  Static Files   │            │
│  │  Gateway        │    │  Controller     │    │  (Dashboard)    │            │
│  │  (Real-time)    │    │  (/api/*)       │    │  (/dashboard)   │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      🔧 OpenShift Service                               │   │
│  │                                                                         │   │
│  │  • Pod Status Monitoring (every 5 seconds)                             │   │
│  │  • Namespace Management                                                 │   │
│  │  • Pod Actions (Start/Stop/Restart)                                    │   │
│  │  • Statistics Collection                                               │   │
│  │  • Health Monitoring                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ☸️  OpenShift/Kubernetes Cluster                           │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   Namespace A   │    │   Namespace B   │    │   Namespace C   │            │
│  │                 │    │                 │    │                 │            │
│  │  🏃 Pod 1       │    │  🏃 Pod 1       │    │  ⏸️  Pod 1      │            │
│  │  🏃 Pod 2       │    │  ⏸️  Pod 2      │    │  🏃 Pod 2       │            │
│  │  ⚠️  Pod 3      │    │  🏃 Pod 3       │    │  🏃 Pod 3       │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
│  Legend: 🏃 Running   ⏸️ Stopped   ⚠️ Failed   ⏳ Pending                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

1. **Real-time Monitoring**: 
   - NestJS service polls Kubernetes API every 5 seconds
   - Pod status changes are detected and cached
   - WebSocket broadcasts updates to all connected clients

2. **User Actions**:
   - User clicks Start/Stop/Restart buttons in dashboard
   - WebSocket message sent to server
   - Server executes Kubernetes API calls (scale deployments, delete pods)
   - Action results broadcast to all clients

3. **API Integration**:
   - Uses official Kubernetes JavaScript client
   - Supports kubeconfig file or service account authentication
   - Handles multiple namespaces simultaneously

## 🏗️ Key Components

### Frontend (Vue.js 3)
- **Real-time Dashboard**: Live statistics and pod status
- **Interactive Controls**: Namespace-level bulk operations
- **Responsive Design**: Works on desktop and mobile
- **WebSocket Client**: Real-time updates without refresh

### Backend (NestJS)
- **WebSocket Gateway**: Bidirectional real-time communication
- **REST API**: Traditional HTTP endpoints for integration
- **Scheduled Tasks**: Automated pod status monitoring
- **Configuration Management**: Environment-based settings

### Kubernetes Integration
- **Pod Monitoring**: List, watch, and track pod states
- **Deployment Control**: Scale deployments up/down
- **Pod Management**: Delete pods for restart functionality
- **Namespace Support**: Monitor multiple namespaces

## 🛡️ Security Features

- **RBAC Integration**: Uses Kubernetes role-based access control
- **Minimal Permissions**: Only requires necessary pod/deployment access  
- **Service Account**: Can run with dedicated service account
- **Environment Isolation**: Configurable namespace monitoring

## 📊 Monitoring Capabilities

- **Pod States**: Running, Pending, Failed, Unknown
- **Container Info**: Per-pod container status and restart counts
- **Node Assignment**: Which cluster node each pod runs on
- **Age Tracking**: Pod creation time and uptime
- **Label Inspection**: Kubernetes labels and annotations

---

This architecture provides a complete real-time monitoring and control solution for OpenShift/Kubernetes pods with a modern web interface.
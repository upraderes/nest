#!/bin/bash

# OpenShift Pod Monitor Startup Script

echo "🚀 Starting OpenShift Pod Monitor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application if dist doesn't exist or if source files are newer
if [ ! -d "dist" ] || find src -name "*.ts" -newer dist 2>/dev/null | grep -q .; then
    echo "🔨 Building application..."
    npm run build
fi

# Set default environment variables if not set
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3000}
export OPENSHIFT_NAMESPACES=${OPENSHIFT_NAMESPACES:-"default,kube-system,openshift-console,openshift-monitoring"}

echo "🌐 Starting server on port ${PORT}..."
echo "📊 Dashboard will be available at: http://localhost:${PORT}/dashboard"
echo "🔧 Monitoring namespaces: ${OPENSHIFT_NAMESPACES}"

# Check if kubeconfig is available
if [ -n "$KUBECONFIG" ]; then
    echo "🔑 Using kubeconfig: ${KUBECONFIG}"
elif [ -f "$HOME/.kube/config" ]; then
    echo "🔑 Using default kubeconfig: $HOME/.kube/config"
else
    echo "⚠️  No kubeconfig found. The application will show 'disconnected' status."
    echo "   To connect to a cluster, either:"
    echo "   - Set KUBECONFIG environment variable: export KUBECONFIG=/path/to/kubeconfig"
    echo "   - Place your kubeconfig at: $HOME/.kube/config"
    echo "   - Deploy inside an OpenShift/Kubernetes cluster with proper service account"
fi

echo ""
echo "🎯 Starting application..."

# Start the application
if [ "$NODE_ENV" = "development" ]; then
    npm run start:dev
else
    node dist/main.js
fi
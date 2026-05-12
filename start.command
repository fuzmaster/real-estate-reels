#!/bin/bash
# Double-click this file on Mac to start Genera Reels Web.
# You may need to right-click → Open the first time to bypass Gatekeeper.

cd "$(dirname "$0")"

# Install server dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "Setup failed. Make sure Node.js is installed: https://nodejs.org"
        read -p "Press Enter to close..."
        exit 1
    fi
fi

# Install Remotion dependencies if needed
if [ ! -d "remotion/node_modules" ]; then
    echo "Installing Remotion dependencies (this takes a minute the first time)..."
    cd "$(dirname "$0")/remotion"
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "Remotion setup failed."
        read -p "Press Enter to close..."
        exit 1
    fi
    cd "$(dirname "$0")"
fi

echo ""
echo " Starting Genera Reels Web..."
echo " Open http://localhost:3000 in your browser."
echo ""
echo " Press Ctrl+C to stop the server."
echo ""
npm start

# Event Horizon

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A real-time events monitoring web application powered by the Newscatcher Events API. This application demonstrates how to implement a server-sent events (SSE) like system using REST API polling.

## 🚀 Features

- Real-time event monitoring dashboard
- Integration with Newscatcher Events API
- SSE-like implementation using polling
- Interactive visualization of global events
- Filterable event categories and regions
- Responsive design for desktop and mobile devices

## 📋 Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Newscatcher API key (for production use)

## 🛠️ Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/oleksandrsirenko/event-horizon.git
   cd event-horizon
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your Newscatcher API key:

   ```
   NEWSCATCHER_API_KEY=your_api_key_here
   ```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### Production Mode

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## 🏗️ Project Structure

```
event-horizon/
├── public/            # Static assets
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styles
│   └── script.js      # Frontend JavaScript
├── server/            # Server-side code
│   ├── server.js      # Express server setup
│   ├── api/           # API integration
│   │   └── events.js  # Newscatcher Events API client
│   └── sse/           # SSE implementation
│       └── poller.js  # Polling mechanism
└── package.json       # Project dependencies and scripts
```

## 📚 API Documentation

The application uses the Newscatcher Events API for retrieving real-time event data. For more information about the API, visit the [Newscatcher API documentation](https://newscatcherapi.com/docs).

## 🔧 Configuration

The application can be configured using environment variables:

- `PORT`: Server port (default: 3000)
- `NEWSCATCHER_API_KEY`: Your Newscatcher API key
- `POLLING_INTERVAL`: Interval for polling the API in milliseconds (default: 10000)
- `MAX_EVENTS`: Maximum number of events to store (default: 100)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Newscatcher](https://newscatcherapi.com/) for providing the Events API
- [Express](https://expressjs.com/) for the server framework
- [Node.js](https://nodejs.org/) for the runtime environment

---

## 📊 Demo

A live demo of the application is available at: [coming soon]

---

Developed by [Oleksandr Sirenko](https://github.com/oleksandrsirenko)
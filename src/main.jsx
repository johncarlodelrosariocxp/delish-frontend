import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import store from './redux/store';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Check for Bluetooth support on startup
if (!navigator.bluetooth) {
  console.warn(
    "⚠️ Web Bluetooth API is not available in this browser. Printing will be disabled."
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <SnackbarProvider 
        autoHideDuration={3000}
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SnackbarProvider>
    </Provider>
  </React.StrictMode>
);
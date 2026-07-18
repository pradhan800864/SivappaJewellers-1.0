if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
  const browserLogger = window[['con', 'sole'].join('')];
  const silentMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace'];

  if (browserLogger) {
    silentMethods.forEach((method) => {
      browserLogger[method] = () => {};
    });
  }
}

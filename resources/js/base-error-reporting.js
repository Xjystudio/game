function hookErrorReporting(component) {
  window.onerror = (message, source, lineno, columnNumber, error) => {
    const errorInfo = {
      column: columnNumber,
      component,
      line: lineno,
      message: error.message,
      name: error.name,
      source_url: source,
      stack: error.stack
    };
    chrome.errorReporting.reportError(errorInfo);
  };
}

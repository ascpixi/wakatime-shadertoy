(() => {
  let checkCount = 0;
  const maxChecks = 300;

  const checkForShaderToy = () => {
    checkCount++;
    
    if (window.gShaderToy && window.gShaderToy.mCodeEditor) {
      console.log('[WakaTime Injected] Found gShaderToy editor!');
      
      document.dispatchEvent(new CustomEvent('wakatime-editor-ready'));
      
      const editor = window.gShaderToy.mCodeEditor;
      
      editor.on('change', () => {
        document.dispatchEvent(new CustomEvent('wakatime-editor-change'));
      });
      
      editor.on('cursorActivity', () => {
        document.dispatchEvent(new CustomEvent('wakatime-cursor-activity'));
      });
      
      document.dispatchEvent(new CustomEvent('wakatime-cursor-activity'));
      
      /**
       * Handles requests for editor data from the content script
       */
      document.addEventListener('wakatime-request-editor-data', () => {
        if (window.gShaderToy && window.gShaderToy.mCodeEditor) {
          const cursor = window.gShaderToy.mCodeEditor.getCursor();
          const totalLines = window.gShaderToy.mCodeEditor.lastLine() + 1;
          const data = {
            line: cursor.line + 1,
            cursorPos: cursor.ch,
            totalLines: totalLines
          };
          
          document.dispatchEvent(new CustomEvent('wakatime-editor-data-response', {
            detail: data
          }));
        } else {
          document.dispatchEvent(new CustomEvent('wakatime-editor-data-response', {
            detail: null
          }));
        }
      });
      
      console.log('[WakaTime Injected] Setup complete');
      return;
    }
    
    if (checkCount < maxChecks) {
      setTimeout(checkForShaderToy, 100);
    } else {
      console.log(`[WakaTime Injected] Timeout - gShaderToy not found after ${maxChecks} attempts`);
    }
  }
  
  setTimeout(checkForShaderToy, 1000);
})();

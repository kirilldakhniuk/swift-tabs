const MAX_RECENT_FILES = 100;
let mostRecentFiles = [];

function updateMostRecentlyUsed(path) {
    if (!path) return;

    const existingIndex = mostRecentFiles.indexOf(path);
    if (existingIndex !== -1) {
        mostRecentFiles.splice(existingIndex, 1);
    }
    
    mostRecentFiles.unshift(path);
    
    if (mostRecentFiles.length > MAX_RECENT_FILES) {
        mostRecentFiles.length = MAX_RECENT_FILES;
    }
}

function getOpenFilePaths() {
    return [...new Set(
        nova.workspace.textEditors
            .map(editor => editor.document?.path)
            .filter(Boolean)
    )];
}

exports.activate = function() {
  getOpenFilePaths().forEach(path => updateMostRecentlyUsed(path));
  
  nova.workspace.onDidOpenTextDocument(document => {
      if (document.path) updateMostRecentlyUsed(document.path);
  });
};

exports.deactivate = function() {
    mostRecentFiles = [];
};

nova.commands.register("switch-recent.select", workspace => {
  const currentPath = nova.workspace.activeTextEditor?.document?.path;
  const openPaths = getOpenFilePaths();
  
  mostRecentFiles = mostRecentFiles.filter(path => openPaths.includes(path));
  
  const recentFiles = mostRecentFiles.filter(path => path !== currentPath);
  if (recentFiles.length === 0) {
      nova.workspace.showInformativeMessage("No recent files available");
      return;
  }
  
  const displayPaths = recentFiles.map(path => nova.workspace.relativizePath(path));
  
  nova.workspace.showChoicePalette(
      displayPaths,
      {
          placeholder: "Recent Files (⏎ to open)",
          ignoreTab: true
      },
      (choice, index) => {
          if (!choice) return;
          
          const selectedPath = recentFiles[index];
          updateMostRecentlyUsed(selectedPath);
          nova.workspace.openFile(selectedPath);
      }
  );
});
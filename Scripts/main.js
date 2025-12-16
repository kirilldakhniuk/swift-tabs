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

function getFilenameFromPath(path) {
    return path.split(/[/\\]/).pop();
}

function getPinnedFiles() {
    return nova.workspace.config.get("pinned-files", "array") || [];
}

exports.activate = function() {
  getOpenFilePaths().forEach(path => updateMostRecentlyUsed(path));
  
  nova.workspace.onDidOpenTextDocument(document => {
      if (document.path) updateMostRecentlyUsed(document.path);
  });
};

exports.deactivate = function() {
    mostRecentFiles = [];
    
    nova.workspace.config.set("pinned-files", []);
};

nova.commands.register("switch-recent.select", workspace => {
  const currentPath = nova.workspace.activeTextEditor?.document?.path;
  const openPaths = getOpenFilePaths();
  
  mostRecentFiles = mostRecentFiles.filter(path => openPaths.includes(path));
  
  let pinnedFiles = getPinnedFiles().map(relativePath => nova.workspace.path + "/" + relativePath);
  
  const recentFiles = mostRecentFiles.filter(path => path !== currentPath && !pinnedFiles.includes(path));
  
  const combinedFiles = [...new Set([...pinnedFiles, ...recentFiles])];

  if (combinedFiles.length === 0) {
      nova.workspace.showInformativeMessage("No recent files available");
      return;
  }
  
  const fileDetails = combinedFiles.map(path => {
      const relativePath = nova.workspace.relativizePath(path);
      const isPinned = pinnedFiles.includes(path);
      
      return {
          originalPath: path,
          relativePath,
          filename: getFilenameFromPath(relativePath),
          isPinned: isPinned
      };
  });
  
  const filenameCounts = fileDetails.reduce((counts, { filename }) => {
      counts[filename] = (counts[filename] || 0) + 1;
      return counts;
  }, {});
  
  const displayPaths = fileDetails.map(({ filename, relativePath, isPinned }) => {
    const name = filenameCounts[filename] > 1 ? relativePath : filename;
    
    return (isPinned ? "􀎧 " : "") + name;
  });
  
  nova.workspace.showChoicePalette(
      displayPaths,
      {
          placeholder: "Recent Files (⏎ to open)",
          ignoreTab: true
      },
      (choice, index) => {
          if (!choice) return;
          
          const selectedPath = fileDetails[index].originalPath;
          updateMostRecentlyUsed(selectedPath);
          nova.workspace.openFile(selectedPath);
      }
  );
});

nova.commands.register("switch-recent.pin", workspace => {
  const currentPath = nova.workspace.activeTextEditor?.document?.path;
  
  if (! currentPath) {
    return;
  }
  
  const relativePath = nova.workspace.relativizePath(currentPath);
  
  let pinnedFiles = getPinnedFiles();
  
  if (! pinnedFiles.includes(relativePath)) {
    pinnedFiles.push(relativePath);
    
    nova.workspace.config.set("pinned-files", pinnedFiles);
  }
});

nova.commands.register("switch-recent.unpin", workspace => {  
  let pinnedFiles = getPinnedFiles();
  
  if (pinnedFiles.length === 0) {
    nova.workspace.showInformativeMessage("No files are pinned.");
    return;
  }

  const fileDetails = pinnedFiles.map(relativePath => ({
      relativePath: relativePath,
      filename: getFilenameFromPath(relativePath)
  }));
  
  const displayPaths = fileDetails.map(detail => detail.filename);

  nova.workspace.showChoicePalette(
    displayPaths,
    { placeholder: "Select a file to unpin" },
    (choice, index) => {
      if (choice) {
        nova.workspace.config.set(
          "pinned-files",
          pinnedFiles.filter(path => path !== fileDetails[index].relativePath)
        );
      }
    }
  );
});
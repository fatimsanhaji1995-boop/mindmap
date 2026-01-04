import { useState } from 'react';
import { FloatablePanel } from './FloatablePanel.jsx';
import { FontStyleEditor } from './FontStyleEditor.jsx';
import { FileLoader } from './FileLoader.jsx';
import { Button } from '@/components/ui/button.jsx';

/**
 * FloatableInterfaceExample Component
 * 
 * This component demonstrates how to use the FloatablePanel, FontStyleEditor,
 * and FileLoader components together to create a complete floatable interface system.
 * 
 * You can copy this pattern to integrate into your App.jsx
 */
export const FloatableInterfaceExample = () => {
  // Panel visibility states
  const [showFileLoader, setShowFileLoader] = useState(false);
  const [showFontEditor, setShowFontEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Font style state
  const [fontStyle, setFontStyle] = useState({
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 1.5,
  });

  // File state
  const [loadedFile, setLoadedFile] = useState(null);

  // Font presets
  const fontPresets = [
    {
      name: 'Heading',
      fontFamily: 'Georgia',
      fontSize: 32,
      fontWeight: 700,
      color: '#1A75FF',
      backgroundColor: '#FFFFFF',
      letterSpacing: 1,
      lineHeight: 1.2,
    },
    {
      name: 'Body',
      fontFamily: 'Arial',
      fontSize: 14,
      fontWeight: 400,
      color: '#333333',
      backgroundColor: '#FFFFFF',
      letterSpacing: 0,
      lineHeight: 1.6,
    },
    {
      name: 'Code',
      fontFamily: 'Courier New',
      fontSize: 12,
      fontWeight: 400,
      color: '#FFFFFF',
      backgroundColor: '#1E1E1E',
      letterSpacing: 0.5,
      lineHeight: 1.5,
    },
    {
      name: 'Highlight',
      fontFamily: 'Verdana',
      fontSize: 18,
      fontWeight: 600,
      color: '#FF6B6B',
      backgroundColor: '#FFF5F5',
      letterSpacing: 0.5,
      lineHeight: 1.4,
    },
  ];

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
  };

  const handleFileLoad = (fileData) => {
    console.log('File loaded:', fileData);
    setLoadedFile(fileData);
  };

  const handleFontStyleChange = (newStyle) => {
    setFontStyle(newStyle);
    console.log('Font style changed:', newStyle);
  };

  return (
    <div className="floatable-interface-example">
      {/* Control Buttons - Usually placed in a fixed position */}
      <div className="fixed top-4 left-4 z-50 flex gap-2 flex-wrap">
        <Button
          onClick={() => setShowFileLoader(!showFileLoader)}
          variant={showFileLoader ? 'default' : 'outline'}
          size="sm"
        >
          📁 Files
        </Button>
        <Button
          onClick={() => setShowFontEditor(!showFontEditor)}
          variant={showFontEditor ? 'default' : 'outline'}
          size="sm"
        >
          ✏️ Font
        </Button>
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant={showSettings ? 'default' : 'outline'}
          size="sm"
        >
          ⚙️ Settings
        </Button>
      </div>

      {/* File Loader Panel */}
      {showFileLoader && (
        <FloatablePanel
          id="file-loader-panel"
          title="📁 File Loader"
          defaultPosition={{ x: 20, y: 80 }}
          defaultSize={{ width: 380, height: 420 }}
          onClose={() => setShowFileLoader(false)}
        >
          <FileLoader
            onFileSelect={handleFileSelect}
            onFileLoad={handleFileLoad}
            acceptedFormats={['.json', '.txt', '.csv']}
            maxFileSize={50 * 1024 * 1024}
          />
          {loadedFile && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-semibold text-green-900">
                Loaded: {loadedFile.file.name}
              </p>
            </div>
          )}
        </FloatablePanel>
      )}

      {/* Font Style Editor Panel */}
      {showFontEditor && (
        <FloatablePanel
          id="font-editor-panel"
          title="✏️ Font Style Editor"
          defaultPosition={{ x: 420, y: 80 }}
          defaultSize={{ width: 380, height: 600 }}
          onClose={() => setShowFontEditor(false)}
        >
          <FontStyleEditor
            fontStyle={fontStyle}
            onStyleChange={handleFontStyleChange}
            presets={fontPresets}
          />
        </FloatablePanel>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <FloatablePanel
          id="settings-panel"
          title="⚙️ Settings"
          defaultPosition={{ x: 820, y: 80 }}
          defaultSize={{ width: 350, height: 400 }}
          onClose={() => setShowSettings(false)}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Current Font Style</h4>
              <div className="bg-muted p-3 rounded text-xs space-y-1 font-mono">
                <p>Family: {fontStyle.fontFamily}</p>
                <p>Size: {fontStyle.fontSize}px</p>
                <p>Weight: {fontStyle.fontWeight}</p>
                <p>Color: {fontStyle.color}</p>
                <p>Background: {fontStyle.backgroundColor}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Loaded File Info</h4>
              {loadedFile ? (
                <div className="bg-muted p-3 rounded text-xs space-y-1">
                  <p>
                    <strong>Name:</strong> {loadedFile.file.name}
                  </p>
                  <p>
                    <strong>Size:</strong> {(loadedFile.file.size / 1024).toFixed(2)} KB
                  </p>
                  <p>
                    <strong>Type:</strong> {loadedFile.file.type || 'Unknown'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No file loaded</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Drag panels by their header to move them</li>
                <li>Resize panels from the bottom-right corner</li>
                <li>Use presets for quick style changes</li>
                <li>All panels are independent and floatable</li>
              </ul>
            </div>
          </div>
        </FloatablePanel>
      )}

      {/* Main Content Area - Example */}
      <div className="mt-20 p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Floatable Interface System</h1>
        <p className="text-muted-foreground mb-6">
          This example demonstrates the floatable interface components. Click the buttons
          in the top-left to open different panels. Each panel can be dragged and resized.
        </p>

        {/* Preview with current font style */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 bg-muted/30">
          <p
            style={{
              fontFamily: fontStyle.fontFamily,
              fontSize: `${fontStyle.fontSize}px`,
              fontWeight: fontStyle.fontWeight,
              color: fontStyle.color,
              backgroundColor: fontStyle.backgroundColor,
              letterSpacing: `${fontStyle.letterSpacing}px`,
              lineHeight: fontStyle.lineHeight,
              padding: '1rem',
              borderRadius: '0.5rem',
            }}
          >
            This text uses your current font style settings. Change them in the Font Style
            Editor panel to see the preview update in real-time!
          </p>
        </div>
      </div>
    </div>
  );
};

export default FloatableInterfaceExample;

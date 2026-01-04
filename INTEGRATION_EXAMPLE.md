# Integration Example for App.jsx

This guide shows how to integrate the floatable interface components into your existing `App.jsx`.

## Current Structure

Your `App.jsx` currently has:
- A fixed control panel on the left side (top-4 left-4)
- File loading controls
- Node and link editing
- Camera controls
- OG mode controls

## Integration Steps

### Step 1: Import the Components

Add these imports at the top of your `App.jsx`:

```javascript
import { FloatablePanel } from '@/components/FloatablePanel.jsx';
import { FontStyleEditor } from '@/components/FontStyleEditor.jsx';
import { FileLoader } from '@/components/FileLoader.jsx';
```

### Step 2: Add State for Floatable Panels

Add these state variables after your existing state declarations:

```javascript
// Floatable interface states
const [showFloatableFileLoader, setShowFloatableFileLoader] = useState(false);
const [showFloatableFontEditor, setShowFloatableFontEditor] = useState(false);
const [nodeTextStyle, setNodeTextStyle] = useState({
  fontFamily: 'Arial',
  fontSize: 6,
  fontWeight: 400,
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  letterSpacing: 0,
  lineHeight: 1.5,
});
```

### Step 3: Replace File Loading Controls

**Before (Current):**
```javascript
{showControls && (
  <div className="absolute top-4 left-4 z-10 w-[21%] min-w-[140px] sm:w-64 max-h-[80vh] overflow-y-auto">
    <Card>
      <CardHeader>
        {/* ... */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Operations */}
        <div className="space-y-2">
          <Label>Load JSON File</Label>
          <Input
            type="file"
            accept=".json"
            onChange={(e) => setSelectedFileForLoad(e.target.files[0])}
          />
          {/* ... */}
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

**After (Floatable):**
```javascript
{showFloatableFileLoader && (
  <FloatablePanel
    id="file-loader-panel"
    title="📁 File Loader"
    defaultPosition={{ x: 20, y: 80 }}
    defaultSize={{ width: 380, height: 420 }}
    onClose={() => setShowFloatableFileLoader(false)}
  >
    <FileLoader
      onFileSelect={(file) => setSelectedFileForLoad(file)}
      onFileLoad={(fileData) => {
        try {
          const data = fileData.data;
          const nodes = data.nodes.map(node => ({
            ...node,
            color: node.color || '#1A75FF',
            textSize: node.textSize || 6,
          }));
          const links = data.links.map(link => ({
            ...link,
            source: typeof link.source === 'object' ? link.source.id : link.source,
            target: typeof link.target === 'object' ? link.target.id : link.target,
            color: link.color || '#F0F0F0',
            thickness: link.thickness || 1,
          }));
          setGraphData({ nodes, links });
          setLoadedFileName(fileData.file.name);
        } catch (error) {
          console.error('Error loading file:', error);
        }
      }}
      acceptedFormats={['.json']}
    />
  </FloatablePanel>
)}
```

### Step 4: Add Floatable Font Editor

Add this panel alongside your existing controls:

```javascript
{showFloatableFontEditor && (
  <FloatablePanel
    id="font-editor-panel"
    title="✏️ Font Style Editor"
    defaultPosition={{ x: 420, y: 80 }}
    defaultSize={{ width: 380, height: 550 }}
    onClose={() => setShowFloatableFontEditor(false)}
  >
    <FontStyleEditor
      fontStyle={nodeTextStyle}
      onStyleChange={(newStyle) => {
        setNodeTextStyle(newStyle);
        // Apply to selected node if any
        if (selectedNodeForEdit) {
          setGraphData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n =>
              n.id === selectedNodeForEdit.id
                ? {
                    ...n,
                    textSize: newStyle.fontSize / 10, // Scale down for 3D
                    color: newStyle.color,
                  }
                : n
            )
          }));
        }
      }}
      presets={[
        {
          name: 'Large',
          fontFamily: 'Arial',
          fontSize: 20,
          fontWeight: 700,
          color: '#FF6B6B',
          backgroundColor: 'transparent',
          letterSpacing: 1,
          lineHeight: 1.2,
        },
        {
          name: 'Medium',
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 500,
          color: '#4ECDC4',
          backgroundColor: 'transparent',
          letterSpacing: 0,
          lineHeight: 1.5,
        },
        {
          name: 'Small',
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: 400,
          color: '#1A75FF',
          backgroundColor: 'transparent',
          letterSpacing: -0.5,
          lineHeight: 1.3,
        },
      ]}
    />
  </FloatablePanel>
)}
```

### Step 5: Add Toggle Buttons

Replace your existing "Show Controls" button with floatable toggles:

```javascript
{!showControls && (
  <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
    <Button
      onClick={() => setShowControls(true)}
      size="sm"
    >
      Show Main Panel
    </Button>
    <Button
      onClick={() => setShowFloatableFileLoader(!showFloatableFileLoader)}
      variant={showFloatableFileLoader ? 'default' : 'outline'}
      size="sm"
    >
      📁 Files
    </Button>
    <Button
      onClick={() => setShowFloatableFontEditor(!showFloatableFontEditor)}
      variant={showFloatableFontEditor ? 'default' : 'outline'}
      size="sm"
    >
      ✏️ Font
    </Button>
  </div>
)}
```

### Step 6: Update Main Control Panel

Keep your main control panel but make it floatable too:

```javascript
{showControls && (
  <FloatablePanel
    id="main-controls-panel"
    title="🎮 Graph Controls"
    defaultPosition={{ x: 20, y: 80 }}
    defaultSize={{ width: 380, height: 600 }}
    onClose={() => setShowControls(false)}
  >
    <CardContent className="space-y-4">
      {/* Your existing controls here */}
    </CardContent>
  </FloatablePanel>
)}
```

## Complete Integration Pattern

Here's a complete example of how to structure your panels:

```javascript
// At the top of your component
const [panels, setPanels] = useState({
  main: true,
  fileLoader: false,
  fontEditor: false,
  ogMode: false,
  cameraControls: false,
});

// Toggle function
const togglePanel = (panelName) => {
  setPanels(prev => ({
    ...prev,
    [panelName]: !prev[panelName],
  }));
};

// In your JSX
return (
  <>
    {/* Toggle Buttons */}
    <div className="fixed top-4 left-4 z-50 flex gap-2 flex-wrap">
      <Button
        onClick={() => togglePanel('main')}
        variant={panels.main ? 'default' : 'outline'}
        size="sm"
      >
        Main
      </Button>
      <Button
        onClick={() => togglePanel('fileLoader')}
        variant={panels.fileLoader ? 'default' : 'outline'}
        size="sm"
      >
        📁 Files
      </Button>
      <Button
        onClick={() => togglePanel('fontEditor')}
        variant={panels.fontEditor ? 'default' : 'outline'}
        size="sm"
      >
        ✏️ Font
      </Button>
    </div>

    {/* Main Panel */}
    {panels.main && (
      <FloatablePanel
        id="main-panel"
        title="🎮 Controls"
        defaultPosition={{ x: 20, y: 80 }}
        onClose={() => togglePanel('main')}
      >
        {/* Your existing controls */}
      </FloatablePanel>
    )}

    {/* File Loader Panel */}
    {panels.fileLoader && (
      <FloatablePanel
        id="file-loader"
        title="📁 File Loader"
        defaultPosition={{ x: 420, y: 80 }}
        onClose={() => togglePanel('fileLoader')}
      >
        <FileLoader
          onFileLoad={handleFileLoad}
          acceptedFormats={['.json']}
        />
      </FloatablePanel>
    )}

    {/* Font Editor Panel */}
    {panels.fontEditor && (
      <FloatablePanel
        id="font-editor"
        title="✏️ Font Editor"
        defaultPosition={{ x: 820, y: 80 }}
        onClose={() => togglePanel('fontEditor')}
      >
        <FontStyleEditor
          fontStyle={nodeTextStyle}
          onStyleChange={setNodeTextStyle}
        />
      </FloatablePanel>
    )}

    {/* Your 3D Graph */}
    <ForceGraph3D
      ref={graphRef}
      graphData={graphData}
      {/* ... other props */}
    />
  </>
);
```

## Benefits of This Approach

✅ **Cleaner UI** - Panels only appear when needed
✅ **More Space** - No fixed sidebar taking up screen real estate
✅ **Flexible Layout** - Users can arrange panels as they like
✅ **Better UX** - Drag and resize panels to preference
✅ **Scalable** - Easy to add more panels
✅ **Responsive** - Works on all screen sizes

## Migration Checklist

- [ ] Import floatable components
- [ ] Add state for panels
- [ ] Create FileLoader panel
- [ ] Create FontStyleEditor panel
- [ ] Add toggle buttons
- [ ] Test file loading
- [ ] Test font editing
- [ ] Test dragging and resizing
- [ ] Test on mobile devices
- [ ] Update documentation

## Next Steps

1. Start with the FileLoader panel
2. Add the FontStyleEditor panel
3. Convert your main controls to a floatable panel
4. Test all functionality
5. Adjust positions and sizes as needed
6. Customize styling to match your theme

---

For more details, see `FLOATABLE_INTERFACE_GUIDE.md`

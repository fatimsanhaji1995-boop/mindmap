# Floatable Interface System - Complete Guide

A comprehensive, production-ready floatable interface system for React applications with drag-and-drop, resizing, font customization, and file loading capabilities.

## 📦 Components Overview

### 1. **FloatablePanel** (`FloatablePanel.jsx`)
A draggable and resizable panel component that floats above other content.

**Features:**
- ✅ Drag-to-move functionality with smooth animations
- ✅ Resize from bottom-right corner
- ✅ Customizable position and size
- ✅ Close button with callback
- ✅ Responsive design
- ✅ Framer Motion animations
- ✅ Dark mode support

**Props:**
```javascript
<FloatablePanel
  id="unique-id"                    // Unique identifier
  title="Panel Title"               // Header title
  defaultPosition={{ x: 20, y: 20 }} // Initial position
  defaultSize={{ width: 400, height: 500 }} // Initial size
  minWidth={300}                    // Minimum width
  minHeight={200}                   // Minimum height
  isDraggable={true}                // Enable dragging
  isResizable={true}                // Enable resizing
  onClose={() => {}}                // Close callback
  className="custom-class"          // Additional CSS classes
>
  {/* Content */}
</FloatablePanel>
```

### 2. **FontStyleEditor** (`FontStyleEditor.jsx`)
A comprehensive font customization interface with live preview.

**Features:**
- ✅ Font family selection (15+ fonts)
- ✅ Font size slider (8px - 72px)
- ✅ Font weight selection (Light to Black)
- ✅ Text color picker with hex input
- ✅ Background color picker with hex input
- ✅ Advanced options (letter spacing, line height)
- ✅ Preset styles for quick changes
- ✅ Live preview of changes
- ✅ Accessible form controls

**Props:**
```javascript
<FontStyleEditor
  fontStyle={{
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 1.5,
  }}
  onStyleChange={(newStyle) => {}}  // Style change callback
  presets={[                         // Optional preset styles
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
  ]}
/>
```

### 3. **FileLoader** (`FileLoader.jsx`)
A file loading interface with drag-and-drop support.

**Features:**
- ✅ Drag-and-drop file upload
- ✅ File format validation
- ✅ File size validation
- ✅ Status messages (loading, success, error)
- ✅ File info display
- ✅ Support for multiple file formats
- ✅ Responsive design
- ✅ Accessibility features

**Props:**
```javascript
<FileLoader
  onFileSelect={(file) => {}}       // File selection callback
  onFileLoad={(fileData) => {}}     // File load callback
  acceptedFormats={['.json']}       // Accepted file extensions
  maxFileSize={10 * 1024 * 1024}    // Max file size in bytes
  allowMultiple={false}             // Allow multiple files
/>
```

## 🚀 Quick Start

### Step 1: Import Components

```javascript
import { FloatablePanel } from '@/components/FloatablePanel.jsx';
import { FontStyleEditor } from '@/components/FontStyleEditor.jsx';
import { FileLoader } from '@/components/FileLoader.jsx';
```

### Step 2: Add State Management

```javascript
const [showFileLoader, setShowFileLoader] = useState(false);
const [showFontEditor, setShowFontEditor] = useState(false);
const [fontStyle, setFontStyle] = useState({
  fontFamily: 'Arial',
  fontSize: 16,
  fontWeight: 400,
  color: '#000000',
  backgroundColor: '#FFFFFF',
  letterSpacing: 0,
  lineHeight: 1.5,
});
```

### Step 3: Render Panels

```javascript
{showFileLoader && (
  <FloatablePanel
    id="file-loader"
    title="📁 File Loader"
    defaultPosition={{ x: 20, y: 80 }}
    onClose={() => setShowFileLoader(false)}
  >
    <FileLoader
      onFileLoad={(fileData) => {
        console.log('File loaded:', fileData);
      }}
    />
  </FloatablePanel>
)}

{showFontEditor && (
  <FloatablePanel
    id="font-editor"
    title="✏️ Font Editor"
    defaultPosition={{ x: 420, y: 80 }}
    onClose={() => setShowFontEditor(false)}
  >
    <FontStyleEditor
      fontStyle={fontStyle}
      onStyleChange={setFontStyle}
    />
  </FloatablePanel>
)}
```

## 📚 Integration with Your App.jsx

### Option 1: Add to Existing Controls Panel

Replace your current file and font controls with floatable panels:

```javascript
// In your App.jsx, add state for panels
const [showFloatableFileLoader, setShowFloatableFileLoader] = useState(false);
const [showFloatableFontEditor, setShowFloatableFontEditor] = useState(false);

// Add toggle buttons to your existing UI
<Button onClick={() => setShowFloatableFileLoader(true)}>
  Open File Loader
</Button>

// Add the panels
{showFloatableFileLoader && (
  <FloatablePanel
    id="file-loader-panel"
    title="📁 Load Files"
    defaultPosition={{ x: 20, y: 80 }}
    onClose={() => setShowFloatableFileLoader(false)}
  >
    <FileLoader
      onFileLoad={handleLoadFile}
      acceptedFormats={['.json']}
    />
  </FloatablePanel>
)}
```

### Option 2: Create a Separate Toolbar

Create a new component for all floatable panels:

```javascript
// FloatableToolbar.jsx
import { FloatablePanel } from '@/components/FloatablePanel.jsx';
import { FontStyleEditor } from '@/components/FontStyleEditor.jsx';
import { FileLoader } from '@/components/FileLoader.jsx';

export const FloatableToolbar = ({ onFileLoad, onFontChange }) => {
  const [panels, setPanels] = useState({
    fileLoader: false,
    fontEditor: false,
  });

  return (
    <>
      {/* Toggle buttons */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <Button onClick={() => setPanels(p => ({ ...p, fileLoader: !p.fileLoader }))}>
          Files
        </Button>
        <Button onClick={() => setPanels(p => ({ ...p, fontEditor: !p.fontEditor }))}>
          Font
        </Button>
      </div>

      {/* Panels */}
      {panels.fileLoader && (
        <FloatablePanel
          id="file-loader"
          title="File Loader"
          onClose={() => setPanels(p => ({ ...p, fileLoader: false }))}
        >
          <FileLoader onFileLoad={onFileLoad} />
        </FloatablePanel>
      )}

      {panels.fontEditor && (
        <FloatablePanel
          id="font-editor"
          title="Font Editor"
          onClose={() => setPanels(p => ({ ...p, fontEditor: false }))}
        >
          <FontStyleEditor onStyleChange={onFontChange} />
        </FloatablePanel>
      )}
    </>
  );
};
```

## 🎨 Customization

### Styling

Each component comes with CSS files that can be customized:

- `FloatablePanel.css` - Panel styling
- `FontStyleEditor.css` - Font editor styling
- `FileLoader.css` - File loader styling

Override colors, spacing, and animations by modifying these files or adding custom CSS.

### Theme Integration

The components use CSS variables for theming:

```css
/* Customize in your global CSS */
:root {
  --primary: 210 40% 96%;
  --border: 214 32% 91%;
  --muted: 210 40% 96%;
  --foreground: 222 84% 5%;
}
```

### Custom Presets

Define custom font presets:

```javascript
const customPresets = [
  {
    name: 'My Custom Style',
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: 600,
    color: '#1A75FF',
    backgroundColor: '#F0F8FF',
    letterSpacing: 0.5,
    lineHeight: 1.4,
  },
];

<FontStyleEditor
  fontStyle={fontStyle}
  onStyleChange={setFontStyle}
  presets={customPresets}
/>
```

## 🔧 Advanced Usage

### Programmatic Panel Control

```javascript
const panelRef = useRef(null);

// Save panel state to localStorage
const savePanelState = () => {
  const state = {
    position: { x: panelRef.current.style.left, y: panelRef.current.style.top },
    size: { width: panelRef.current.style.width, height: panelRef.current.style.height },
  };
  localStorage.setItem('panelState', JSON.stringify(state));
};

// Restore panel state
const restorePanelState = () => {
  const saved = localStorage.getItem('panelState');
  if (saved) {
    const state = JSON.parse(saved);
    // Apply state to panel
  }
};
```

### Event Handling

```javascript
// File loaded event
const handleFileLoad = (fileData) => {
  console.log('File:', fileData.file.name);
  console.log('Content:', fileData.content);
  console.log('Parsed data:', fileData.data);
};

// Font style changed event
const handleFontChange = (newStyle) => {
  // Update your application with new font style
  applyFontStyle(newStyle);
};
```

### Validation and Error Handling

```javascript
// Custom file validation
const validateFile = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large');
  }
  if (!file.name.endsWith('.json')) {
    throw new Error('Invalid file format');
  }
  return true;
};

// Error handling in FileLoader
<FileLoader
  onFileLoad={handleFileLoad}
  acceptedFormats={['.json', '.txt']}
  maxFileSize={5 * 1024 * 1024}
/>
```

## 📱 Responsive Design

All components are fully responsive and work on:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

Panels automatically adjust their size and positioning on smaller screens.

## ♿ Accessibility

Components include:
- Semantic HTML
- ARIA labels
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Screen reader support

## 🌙 Dark Mode

All components support dark mode through CSS media queries:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}
```

## 🐛 Troubleshooting

### Panel not dragging
- Ensure `isDraggable={true}` prop is set
- Check if element has `data-no-drag` attribute

### Font changes not applying
- Verify `onStyleChange` callback is properly connected
- Check if style state is being updated

### File not loading
- Verify file format is in `acceptedFormats`
- Check file size is under `maxFileSize`
- Check browser console for parsing errors

## 📦 Dependencies

Required packages (already in your project):
- `react` (v19.1.0+)
- `react-dom` (v19.1.0+)
- `framer-motion` (v12.15.0+)
- `lucide-react` (v0.510.0+)
- `@radix-ui/*` (various components)
- `tailwindcss` (v4.1.7+)

## 📄 License

These components are provided as-is for use in your project.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the example implementation
3. Check browser console for errors
4. Verify all dependencies are installed

## 📝 Changelog

### Version 1.0.0
- Initial release
- FloatablePanel component
- FontStyleEditor component
- FileLoader component
- Complete documentation
- Example implementation

---

**Last Updated:** January 2026
**Version:** 1.0.0

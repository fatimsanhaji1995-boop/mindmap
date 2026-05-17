# Clipboard Paste Feature Guide

## Overview

The mindmap application now supports seamless **copy-paste** functionality for images, text, and links directly from your browser or other applications. This feature makes it easy to capture visual content and information from the web and incorporate it into your mindmap.

## Features

### 1. **Paste Images from Browser**
- Copy any image from a webpage (right-click → Copy Image)
- Paste directly into the mindmap with **Ctrl+V** (or **Cmd+V** on Mac)
- Images are automatically converted to data URLs and stored as nodes
- Image nodes are displayed with a pink color (`#FF6B9D`) and marked as image type

### 2. **Paste Text Content**
- Copy text from any webpage or document
- Paste into the mindmap to create a text node
- Text content is stored and displayed as a preview in the node
- Text nodes are displayed in cyan color (`#00ffff`)

### 3. **Paste Links**
- Copy URLs from your browser address bar or any link
- Paste into the mindmap to create link nodes
- URLs are automatically extracted from text content
- Link nodes are displayed in gold color (`#FFD700`) with a URL preview

### 4. **Mixed Content Paste**
- Paste content that contains both text and links
- The system automatically separates and creates appropriate nodes for each type
- All nodes are positioned in front of your camera view for easy visibility

## How to Use

### Basic Paste Operation

1. **Copy content** from your browser or application:
   - For images: Right-click on an image → "Copy image"
   - For text/links: Select text → Ctrl+C (or Cmd+C on Mac)

2. **Click on the mindmap** to ensure it has focus

3. **Paste** using Ctrl+V (or Cmd+V on Mac)

4. **Watch the console** for confirmation:
   - You'll see a message like: `✓ Pasted: image(s), text, link(s) (3 node(s) created)`

### Important Notes

- **Paste only works when the mindmap canvas has focus** (not in an input field)
- **Nodes are positioned in front of your camera** for immediate visibility
- **All pasted nodes are grouped** under the "pasted" category
- **Images are stored as data URLs** (embedded in the mindmap data)
- **Text content is truncated** in the display but stored fully in the node data

## Node Types Created

### Image Nodes
- **Color**: Pink (`#FF6B9D`)
- **Display**: Shows "IMG" placeholder
- **Data**: Stores the full image as a data URL
- **Property**: `imageUrl` contains the base64-encoded image

### Text Nodes
- **Color**: Cyan (`#00ffff`)
- **Display**: Shows first 25 characters of text with ellipsis
- **Data**: Full text stored in `textContent` property
- **Property**: `textContent` contains the complete pasted text

### Link Nodes
- **Color**: Gold (`#FFD700`)
- **Display**: Shows first 20 characters of URL with ellipsis
- **Data**: Full URL stored in `url` property
- **Property**: `url` contains the complete URL

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Paste content | **Ctrl+V** (Windows/Linux) or **Cmd+V** (Mac) |
| Create new node (inline) | **N** |
| Create link between nodes | **L** |
| Toggle console | **Tab** |
| Zoom out | See console commands |

## Example Workflows

### Workflow 1: Collecting Web Research
1. Browse a webpage
2. Find an interesting image → Copy image
3. Click mindmap → Paste (creates image node)
4. Copy a paragraph of text → Paste (creates text node)
5. Copy the URL from address bar → Paste (creates link node)
6. All three nodes appear in your mindmap, ready to organize

### Workflow 2: Building a Project Board
1. Copy project links from Jira/GitHub → Paste (creates link nodes)
2. Copy team member names/descriptions → Paste (creates text nodes)
3. Copy project screenshots → Paste (creates image nodes)
4. Organize nodes by dragging them in the 3D space
5. Create links between related nodes using the **L** key

### Workflow 3: Quick Idea Capture
1. See something interesting online
2. Copy the image and text together
3. Paste into mindmap
4. The system creates separate nodes for image, text, and any URLs
5. Nodes appear clustered together for easy grouping

## Technical Details

### Node Properties

All pasted nodes include:
```javascript
{
  id: "unique_identifier",
  color: "#FF6B9D",           // Color based on type
  textSize: 6,                // Display size
  group: "pasted",            // Category
  x, y, z: position,          // 3D coordinates
  fx, fy, fz: position,       // Fixed position
  nodeType: "image|text|link", // Type indicator
  // Type-specific properties:
  imageUrl: "data:image/...",  // For image nodes
  textContent: "...",          // For text nodes
  url: "https://...",          // For link nodes
}
```

### Clipboard Data Parsing

The system:
1. Detects paste events globally
2. Extracts image files from clipboard
3. Converts images to data URLs
4. Extracts text content
5. Parses URLs from text using regex
6. Creates appropriate nodes for each content type
7. Positions nodes in front of camera
8. Provides console feedback

### Browser Compatibility

- **Chrome/Edge**: Full support (images, text, links)
- **Firefox**: Full support (images, text, links)
- **Safari**: Full support (images, text, links)
- **Mobile browsers**: Limited support (depends on browser implementation)

## Limitations & Considerations

1. **Data Storage**: Image data URLs can be large. Consider the size when saving/loading
2. **Browser Clipboard**: Some browsers restrict clipboard access for security reasons
3. **Mixed Content**: If you paste content with both images and text, separate nodes are created
4. **Position**: All pasted nodes appear in front of the camera; you may need to reorganize them
5. **Duplicates**: No automatic duplicate detection; you can paste the same content multiple times

## Saving & Loading

Pasted nodes are saved in the same JSON format as regular nodes:
- **Local save**: File → Download as JSON (includes all node data)
- **Cloud save**: File → Save to Vercel DB (stores all node properties)
- **Image data**: Embedded directly in the JSON (increases file size)

## Troubleshooting

### Paste not working?
- Ensure the mindmap canvas has focus (click on it)
- Check that you're not in an input field
- Try using the keyboard shortcut: Ctrl+V

### Images not showing?
- Images are stored as data URLs; very large images may take time to render
- Check browser console for errors
- Try pasting a smaller image first

### Text content not appearing?
- Text is displayed as a preview; click on the node to see full content
- Check the node's properties in the property editor
- Verify text was copied correctly

### Links not being detected?
- Only valid HTTP/HTTPS URLs are detected
- URLs must be complete (starting with http:// or https://)
- Check that URLs are in the text content you pasted

## Tips & Best Practices

1. **Organize after pasting**: Pasted nodes appear clustered; drag them to organize
2. **Use groups**: Pasted nodes are in the "pasted" group; rename to organize better
3. **Link related content**: Use the **L** key to create links between pasted nodes
4. **Save frequently**: After pasting important content, save your mindmap
5. **Preview before saving**: Check that content pasted correctly before saving

## Future Enhancements

Potential improvements to the clipboard feature:
- Automatic image thumbnail generation
- URL metadata extraction (title, description)
- Rich text formatting preservation
- Batch paste operations
- Clipboard history
- Smart duplicate detection
- Image compression options

## Support

For issues or feature requests related to clipboard paste functionality:
1. Check the console for error messages (Tab key)
2. Verify your browser supports clipboard access
3. Try with different content types (image, text, link)
4. Report issues with specific examples of what you tried to paste

---

**Last Updated**: May 2026
**Version**: 1.0

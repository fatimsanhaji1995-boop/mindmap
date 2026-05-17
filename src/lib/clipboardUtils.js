/**
 * Clipboard utilities for handling paste events with images, text, and links
 */

/**
 * Extract URLs from text content
 * @param {string} text - Text to extract URLs from
 * @returns {string[]} Array of URLs found in the text
 */
export function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[.,;:!?'")\\]]*$/, '')); // Remove trailing punctuation
}

/**
 * Convert a File (image) to a data URL
 * @param {File} file - Image file
 * @returns {Promise<string>} Data URL of the image
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse clipboard data and extract images, text, and URLs
 * @param {ClipboardEvent} event - Paste event
 * @returns {Promise<{images: string[], text: string, urls: string[]}>}
 */
export async function parseClipboardData(event) {
  const clipboardData = event.clipboardData || window.clipboardData;
  const result = {
    images: [],
    text: '',
    urls: [],
  };

  if (!clipboardData) return result;

  // Handle image files
  const items = clipboardData.items || [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      try {
        const file = item.getAsFile();
        if (file) {
          const dataUrl = await fileToDataUrl(file);
          result.images.push(dataUrl);
        }
      } catch (error) {
        console.error('Error processing image from clipboard:', error);
      }
    }
  }

  // Handle text and URLs
  const text = clipboardData.getData('text/plain') || '';
  result.text = text;
  result.urls = extractUrls(text);

  // Also check for HTML (some browsers/apps provide URLs in HTML)
  const html = clipboardData.getData('text/html') || '';
  if (html) {
    const htmlUrls = extractUrls(html);
    result.urls = [...new Set([...result.urls, ...htmlUrls])]; // Deduplicate
  }

  return result;
}

/**
 * Generate a unique node ID based on content
 * @param {string} content - Content to base ID on
 * @param {string[]} existingIds - Array of existing node IDs
 * @returns {string} Unique node ID
 */
export function generateNodeId(content, existingIds = []) {
  let baseId = content
    .substring(0, 30)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!baseId) baseId = 'node';

  let id = baseId;
  let counter = 1;

  while (existingIds.includes(id)) {
    id = `${baseId}_${counter}`;
    counter++;
  }

  return id;
}

/**
 * Create node data from pasted content
 * @param {Object} pastedData - Parsed clipboard data
 * @param {Object} position - Position {x, y, z}
 * @param {string[]} existingNodeIds - Array of existing node IDs
 * @returns {Object[]} Array of node objects to add
 */
export function createNodesFromPaste(pastedData, position, existingNodeIds = []) {
  const nodes = [];

  // Create node for each image
  pastedData.images.forEach((imageUrl, index) => {
    const nodeId = generateNodeId(`image_${index}`, [...existingNodeIds, ...nodes.map(n => n.id)]);
    nodes.push({
      id: nodeId,
      color: '#FF6B9D', // Pink for images
      textSize: 8,
      group: 'pasted',
      x: position.x + index * 30,
      y: position.y,
      z: position.z,
      fx: position.x + index * 30,
      fy: position.y,
      fz: position.z,
      imageUrl, // Store image data URL
      nodeType: 'image',
    });
  });

  // Create node for main text content
  if (pastedData.text && pastedData.text.trim()) {
    const textContent = pastedData.text.substring(0, 50);
    const nodeId = generateNodeId(textContent, [...existingNodeIds, ...nodes.map(n => n.id)]);
    nodes.push({
      id: nodeId,
      color: '#00ffff', // Cyan for text
      textSize: 6,
      group: 'pasted',
      x: position.x,
      y: position.y + 30,
      z: position.z,
      fx: position.x,
      fy: position.y + 30,
      fz: position.z,
      nodeType: 'text',
      textContent: pastedData.text, // Store full text
    });
  }

  // Create nodes for URLs
  pastedData.urls.forEach((url, index) => {
    const nodeId = generateNodeId(`link_${index}`, [...existingNodeIds, ...nodes.map(n => n.id)]);
    nodes.push({
      id: nodeId,
      color: '#FFD700', // Gold for links
      textSize: 6,
      group: 'pasted',
      x: position.x - 30,
      y: position.y + index * 25,
      z: position.z,
      fx: position.x - 30,
      fy: position.y + index * 25,
      fz: position.z,
      url, // Store the URL
      nodeType: 'link',
    });
  });

  return nodes;
}

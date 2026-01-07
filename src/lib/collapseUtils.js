/**
 * Utility functions for managing node collapse/expand functionality in the graph
 */

/**
 * Find all descendants of a given node in the graph
 * @param {string} nodeId - The ID of the parent node
 * @param {Array} links - Array of link objects with source and target
 * @returns {Set<string>} Set of descendant node IDs
 */
export function getDescendants(nodeId, links) {
  const descendants = new Set();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    
    // Find all nodes that have currentId as source
    const children = links
      .filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        return sourceId === currentId;
      })
      .map(link => typeof link.target === 'object' ? link.target.id : link.target);
    
    children.forEach(childId => {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    });
  }
  
  return descendants;
}

/**
 * Get all ancestors of a given node in the graph
 * @param {string} nodeId - The ID of the node
 * @param {Array} links - Array of link objects with source and target
 * @returns {Set<string>} Set of ancestor node IDs
 */
export function getAncestors(nodeId, links) {
  const ancestors = new Set();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    
    // Find all nodes that have currentId as target
    const parents = links
      .filter(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return targetId === currentId;
      })
      .map(link => typeof link.source === 'object' ? link.source.id : link.source);
    
    parents.forEach(parentId => {
      if (!ancestors.has(parentId)) {
        ancestors.add(parentId);
        queue.push(parentId);
      }
    });
  }
  
  return ancestors;
}

/**
 * Filter graph data to hide descendants of collapsed nodes
 * @param {Object} graphData - Original graph data with nodes and links
 * @param {Set<string>} collapsedNodes - Set of node IDs that are collapsed
 * @returns {Object} Filtered graph data
 */
export function filterGraphByCollapsedNodes(graphData, collapsedNodes) {
  if (collapsedNodes.size === 0) {
    return graphData;
  }
  
  // Get all descendants of collapsed nodes
  const hiddenNodes = new Set();
  collapsedNodes.forEach(nodeId => {
    const descendants = getDescendants(nodeId, graphData.links);
    descendants.forEach(descendant => hiddenNodes.add(descendant));
  });
  
  // Filter nodes: keep all nodes except hidden ones
  const filteredNodes = graphData.nodes.filter(node => !hiddenNodes.has(node.id));
  
  // Filter links: keep only links where both source and target are visible
  const filteredLinks = graphData.links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return !hiddenNodes.has(sourceId) && !hiddenNodes.has(targetId);
  });
  
  return {
    nodes: filteredNodes,
    links: filteredLinks
  };
}

/**
 * Toggle collapse state for a node
 * @param {string} nodeId - The ID of the node to toggle
 * @param {Set<string>} collapsedNodes - Current set of collapsed nodes
 * @returns {Set<string>} New set of collapsed nodes
 */
export function toggleNodeCollapse(nodeId, collapsedNodes) {
  const newCollapsed = new Set(collapsedNodes);
  
  if (newCollapsed.has(nodeId)) {
    newCollapsed.delete(nodeId);
  } else {
    newCollapsed.add(nodeId);
  }
  
  return newCollapsed;
}

/**
 * Check if a node is collapsed
 * @param {string} nodeId - The ID of the node
 * @param {Set<string>} collapsedNodes - Set of collapsed nodes
 * @returns {boolean} True if the node is collapsed
 */
export function isNodeCollapsed(nodeId, collapsedNodes) {
  return collapsedNodes.has(nodeId);
}

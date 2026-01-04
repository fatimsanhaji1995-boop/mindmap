
import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Slider } from '@/components/ui/slider.jsx';
import './App.css';

function App() {
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [newNodeId, setNewNodeId] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [showOGMode, setShowOGMode] = useState(false);
  const [recordedOGPositions, setRecordedOGPositions] = useState({ nodes: [], links: [] });
  const [showControls, setShowControls] = useState(true);
  const [selectedFileForLoad, setSelectedFileForLoad] = useState(null);
  const [loadedFileName, setLoadedFileName] = useState("graphData.json");
  const [isFocusMode, setIsFocusMode] = useState(false); // New state for focus mode
  const [isLinkSelectionMode, setIsLinkSelectionMode] = useState(false); // Mode for selecting nodes to create links
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState(null); // Node selected for property editing
  const [selectedLinkForEdit, setSelectedLinkForEdit] = useState(null); // Link selected for property editing
  const [copiedNodeStyle, setCopiedNodeStyle] = useState(null); // State to store copied node style
  const [copiedLinkStyle, setCopiedLinkStyle] = useState(null); // State to store copied link style
  const [pullDistance, setPullDistance] = useState(50); // Percentage to pull node closer (0-100%)
  const [selectedNodeToPull, setSelectedNodeToPull] = useState(null); // Node to pull closer to selected node
  
  // Camera control states
  const [showCameraControls, setShowCameraControls] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [cameraBookmarks, setCameraBookmarks] = useState([]);
  const [bookmarkName, setBookmarkName] = useState('');
  const [selectedBookmarkFileForLoad, setSelectedBookmarkFileForLoad] = useState(null);
  const autoRotateRef = useRef(null);

  // Sample data for testing
  useEffect(() => {
    const sampleData = {
      nodes: [
        { id: 'Node1', color: '#1A75FF', textSize: 6, x: 0, y: 0, z: 0 },
        { id: 'Node2', color: '#FF6B6B', textSize: 6, x: 50, y: 0, z: 0 },
        { id: 'Node3', color: '#4ECDC4', textSize: 6, x: 25, y: 50, z: 0 }
      ],
      links: [
        { source: 'Node1', target: 'Node2', color: '#F0F0F0', thickness: 5 },
        { source: 'Node2', target: 'Node3', color: '#F0F0F0', thickness: 1 }
      ]
    };
    setGraphData(sampleData);
  }, []);

  const handleLoadFile = () => {
    if (!selectedFileForLoad) {
      alert('Please select a JSON file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Normalize nodes
        const nodes = data.nodes.map(node => ({
          ...node,
          color: node.color || '#1A75FF',
          textSize: node.textSize || 6,
        }));

        // Normalize links
        const links = data.links.map(link => ({
          ...link,
          source: typeof link.source === 'object' ? link.source.id : link.source,
          target: typeof link.target === 'object' ? link.target.id : link.target,
          color: link.color || '#F0F0F0',
          thickness: link.thickness || 1,
        }));

        setGraphData({ nodes, links });
        alert(`Loaded ${nodes.length} nodes and ${links.length} links successfully!`);
        setLoadedFileName(selectedFileForLoad.name);
        setSelectedFileForLoad(null);
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Error parsing JSON file. Please ensure it is valid JSON.');
      }
    };
    reader.readAsText(selectedFileForLoad);
  };

  const handleNewGraph = () => {
    setGraphData({ nodes: [], links: [] });
    setSelectedFileForLoad(null);
  };

  const handleLoadOGFile = () => {
    if (!selectedFileForLoad) {
      alert("Please select an OG.json file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ogData = JSON.parse(e.target.result);

        setGraphData(prevGraphData => {
          const newNodes = prevGraphData.nodes.map(node => {
            const ogNode = ogData.nodes.find(ogNode => ogNode.id === node.id);
            if (ogNode) {
              return {
                ...node,
                x: ogNode.x,
                y: ogNode.y,
                z: ogNode.z,
                fx: ogNode.x,
                fy: ogNode.y,
                fz: ogNode.z,
              };
            } else {
              return node;
            }
          });
          return { ...prevGraphData, nodes: newNodes, links: ogData.links || [] };
        });
        alert(`Loaded ${ogData.nodes.length} OG positions and ${ogData.links.length} links successfully!`);
        setLoadedFileName(selectedFileForLoad.name.replace(".json", "-OG.json"));
        setSelectedFileForLoad(null);
      } catch (error) {
        console.error("Error parsing OG.json file:", error);
        alert("Error parsing OG.json file. Please ensure it is valid JSON.");
      }
    };
    reader.readAsText(selectedFileForLoad);
  };

  const startLinkSelection = () => {
    setIsLinkSelectionMode(true);
    setSelectedNodes([]);
    setSelectedNodeForEdit(null); // Close property editor
  };

  const addLink = () => {
    if (selectedNodes.length !== 2 || !selectedNodes[0] || !selectedNodes[1]) {
      alert("Please select both source and target nodes to create a link.");
      return;
    }

    const [source, target] = selectedNodes;

    if (graphData.links.some(link => {
      const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
      const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
      return (linkSource === source && linkTarget === target) || (linkSource === target && linkTarget === source);
    })) {
      alert("Link between these two nodes already exists.");
      return;
    }

    const newLink = {
      source,
      target,
      color: 'rgba(240, 240, 240, 1)',
      thickness: 1,
    };

    setGraphData(prev => ({
      ...prev,
      links: [...prev.links, newLink],
    }));

    setSelectedNodes([]); // Clear selection after adding link
  };

  const cancelLinkSelection = () => {
    setIsLinkSelectionMode(false);
    setSelectedNodes([]);
  };

  const pullNodeCloser = () => {
    if (!selectedNodeForEdit || !selectedNodeToPull) {
      alert("Please select a target node");
      return;
    }

    const nodeToMove = graphData.nodes.find(n => n.id === selectedNodeForEdit.id);
    const targetNode = graphData.nodes.find(n => n.id === selectedNodeToPull);

    if (!nodeToMove || !targetNode) {
      alert("Could not find selected nodes");
      return;
    }

    // Calculate the vector from nodeToMove to targetNode
    const dx = targetNode.x - nodeToMove.x;
    const dy = targetNode.y - nodeToMove.y;
    const dz = targetNode.z - nodeToMove.z;

    // Calculate new position based on pull distance percentage
    const pullFactor = pullDistance / 100;
    const newX = nodeToMove.x + (dx * pullFactor);
    const newY = nodeToMove.y + (dy * pullFactor);
    const newZ = nodeToMove.z + (dz * pullFactor);

    // Update the node position (move the selected node)
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === selectedNodeForEdit.id
          ? { ...n, x: newX, y: newY, z: newZ, fx: newX, fy: newY, fz: newZ }
          : n
      )
    }));

    // Update the selected node for edit to reflect new position
    setSelectedNodeForEdit(prev => ({ ...prev, x: newX, y: newY, z: newZ, fx: newX, fy: newY, fz: newZ }));

    alert(`Moved ${selectedNodeForEdit.id} ${pullDistance}% closer to ${selectedNodeToPull}`);
  };

  const addNode = () => {
    const camera = graphRef.current.camera();
    const cameraPos = camera.position;
    const cameraDir = camera.getWorldDirection(new THREE.Vector3());

    if (!newNodeId.trim()) {
      alert('Please enter a node ID');
      return;
    }
    if (graphData.nodes.find(node => node.id === newNodeId.trim())) {
      alert('Node with this ID already exists');
      return;
    }

    let nodePosition;
    
    // If a target node is selected, position the new node closer to it
    if (selectedNodeToPull) {
      const targetNode = graphData.nodes.find(n => n.id === selectedNodeToPull);
      if (targetNode) {
        // Position the new node near the target node with some random offset
        const offset = 30; // Distance from target node
        const randomAngle = Math.random() * Math.PI * 2;
        const randomElevation = (Math.random() - 0.5) * Math.PI * 0.5;
        
        nodePosition = {
          x: targetNode.x + Math.cos(randomAngle) * Math.cos(randomElevation) * offset,
          y: targetNode.y + Math.sin(randomElevation) * offset,
          z: targetNode.z + Math.sin(randomAngle) * Math.cos(randomElevation) * offset,
        };
      } else {
        // Fallback to camera position if target node not found
        nodePosition = {
          x: cameraPos.x + cameraDir.x * 50,
          y: cameraPos.y + cameraDir.y * 50,
          z: cameraPos.z + cameraDir.z * 50,
        };
      }
    } else {
      // Default behavior: position relative to camera
      nodePosition = {
        x: cameraPos.x + cameraDir.x * 50,
        y: cameraPos.y + cameraDir.y * 50,
        z: cameraPos.z + cameraDir.z * 50,
      };
    }

    const newNode = {
      id: newNodeId.trim(),
      color: '#1A75FF',
      textSize: 6,
      x: nodePosition.x,
      y: nodePosition.y,
      z: nodePosition.z,
      fx: nodePosition.x, // Fix position
      fy: nodePosition.y,
      fz: nodePosition.z,
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setNewNodeId('');
    
    // Reset the selected target node after adding
    if (selectedNodeToPull) {
      setSelectedNodeToPull(null);
    }

    // Auto-focus camera on the newly created node
    setTimeout(() => {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(newNode.x, newNode.y, newNode.z);
      const newPos = {
        x: newNode.x * distRatio,
        y: newNode.y * distRatio,
        z: newNode.z * distRatio
      };
      graphRef.current.cameraPosition(
        newPos,
        newNode,
        1500 // transition duration
      );
    }, 100); // Small delay to ensure node is rendered
  };

  const deleteNode = (nodeId) => {
    if (!nodeId) {
      alert('Please select a node to delete');
      return;
    }

    // Remove the node from the graph data
    setGraphData(prev => ({
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      // Also remove any links connected to this node
      links: prev.links.filter(link => {
        const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
        const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
        return linkSource !== nodeId && linkTarget !== nodeId;
      })
    }));

    // Clear selected node if it was the deleted one
    if (selectedNodeForEdit && selectedNodeForEdit.id === nodeId) {
      setSelectedNodeForEdit(null);
    }

    // Clear selected node to pull if it was the deleted one
    if (selectedNodeToPull === nodeId) {
      setSelectedNodeToPull(null);
    }

    // Remove from selected nodes array if present
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));

    alert(`Node ${nodeId} and its connected links have been deleted successfully!`);
  };

  const saveGraphData = () => {
    const cleanData = {
      nodes: graphData.nodes.map(({ id, color, textSize, group, x, y, z }) => ({
        id, color, textSize, group, x, y, z,
      })),
      links: graphData.links.map(({ source, target, color, thickness }) => ({
        source: typeof source === 'object' ? source.id : source,
        target: typeof target === 'object' ? target.id : target,
        color, thickness,
      })),
    };

    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = loadedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Save OG-suffixed JSON if OG mode is active and there are recorded positions
    if (showOGMode && recordedOGPositions.nodes.length > 0) {
      const ogBlob = new Blob([JSON.stringify(recordedOGPositions, null, 2)], { type: 'application/json' });
      const ogUrl = URL.createObjectURL(ogBlob);
      const ogLink = document.createElement('a');
      ogLink.href = ogUrl;
      const ogFileName = loadedFileName.replace('.json', '-OG.json');
      ogLink.download = ogFileName;
      document.body.appendChild(ogLink);
      ogLink.click();
      document.body.removeChild(ogLink);
      URL.revokeObjectURL(ogUrl);
    }
  };

  const recordOGPositions = () => {
    const fixedPositions = graphData.nodes.filter(node => node.fx !== null && node.fy !== null && node.fz !== null).map(node => ({
      id: node.id,
      x: node.fx,
      y: node.fy,
      z: node.fz,
    }));
    const recordedLinks = graphData.links.map(link => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
      color: link.color,
      thickness: link.thickness,
    }));
    setRecordedOGPositions({ nodes: fixedPositions, links: recordedLinks });
    alert(`Recorded ${fixedPositions.length} fixed node positions and ${recordedLinks.length} links for OG mode!`);
  };

  const saveOGPositions = () => {
    if (recordedOGPositions.nodes.length === 0 && recordedOGPositions.links.length === 0) {
      alert("No OG positions or links to save. Please record positions first.");
      return;
    }
    const blob = new Blob([JSON.stringify(recordedOGPositions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "OG.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("OG.json saved successfully!");
  };

  const onNodeDragEnd = useCallback(node => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
    if (showOGMode) {
      const fixedPositions = graphData.nodes.filter(n => n.fx !== null && n.fy !== null && n.fz !== null).map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        z: n.z,
      }));
      const recordedLinks = graphData.links.map(link => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target,
        color: link.color,
        thickness: link.thickness,
      }));
      setRecordedOGPositions({ nodes: fixedPositions, links: recordedLinks });
    }
  }, [showOGMode, graphData.nodes, graphData.links]);

  const handleNextNode = useCallback(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      setSelectedNodeForEdit(null);
      return;
    }

    let nextNodeIndex = 0;
    if (selectedNodeForEdit) {
      const currentIndex = graphData.nodes.findIndex(n => n.id === selectedNodeForEdit.id);
      nextNodeIndex = (currentIndex + 1) % graphData.nodes.length;
    }
    setSelectedNodeForEdit(graphData.nodes[nextNodeIndex]);
    setSelectedLinkForEdit(null); // Reset selected link when changing node
  }, [graphData.nodes, selectedNodeForEdit]);

  const handleCopyNodeStyle = useCallback(() => {
    if (selectedNodeForEdit) {
      setCopiedNodeStyle({
        color: selectedNodeForEdit.color,
        textSize: selectedNodeForEdit.textSize,
      });
      alert(`Style of node ${selectedNodeForEdit.id} copied!`);
    } else {
      alert("No node selected to copy style from.");
    }
  }, [selectedNodeForEdit]);

  const handleApplyNodeStyle = useCallback(() => {
    if (selectedNodeForEdit && copiedNodeStyle) {
      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === selectedNodeForEdit.id
            ? { ...n, ...copiedNodeStyle }
            : n
        )
      }));
      setSelectedNodeForEdit(prev => ({ ...prev, ...copiedNodeStyle }));
      alert(`Style applied to node ${selectedNodeForEdit.id}!`);
    } else if (!copiedNodeStyle) {
      alert("No node style copied yet.");
    } else {
      alert("No node selected to apply style to.");
    }
  }, [selectedNodeForEdit, copiedNodeStyle]);

  const handleCopyLinkStyle = useCallback(() => {
    if (selectedLinkForEdit) {
      setCopiedLinkStyle({
        color: selectedLinkForEdit.color,
        thickness: selectedLinkForEdit.thickness,
      });
      alert(`Style of link ${typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} -> ${typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target} copied!`);
    } else {
      alert("No link selected to copy style from.");
    }
  }, [selectedLinkForEdit]);

  const handleApplyLinkStyle = useCallback(() => {
    if (selectedLinkForEdit && copiedLinkStyle) {
      setGraphData(prev => ({
        ...prev,
        links: prev.links.map(l => {
          const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
          const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
          const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;

          return (lSourceId === sSourceId && lTargetId === sTargetId)
            ? { ...l, ...copiedLinkStyle }
            : l;
        })
      }));
      setSelectedLinkForEdit(prev => ({ ...prev, ...copiedLinkStyle }));
      alert(`Style applied to link ${typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} -> ${typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}!`);
    } else if (!copiedLinkStyle) {
      alert("No link style copied yet.");
    } else {
      alert("No link selected to apply style to.");
    }
  }, [selectedLinkForEdit, copiedLinkStyle]);

  const handleNodeClick = useCallback(node => {
    if (isFocusMode) {
      // Focus on the clicked node
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      const newPos = node.x || node.y || node.z
        ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

      graphRef.current.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    } else if (isLinkSelectionMode) {
      // Click mode for link creation: select nodes by clicking
      setSelectedNodes(prevSelected => {
        if (prevSelected.includes(node.id)) {
          // Deselect if already selected
          return prevSelected.filter(id => id !== node.id);
        } else if (prevSelected.length < 2) {
          // Add to selection if less than 2 nodes selected
          return [...prevSelected, node.id];
        } else {
          // Replace second node if 2 already selected
          return [prevSelected[0], node.id];
        }
      });
    } else {
      // Property editing mode: open property editor for this node
      setSelectedNodeForEdit(node);
      setSelectedLinkForEdit(null); // Reset selected link
    }
  }, [isFocusMode, isLinkSelectionMode]);

  const handleLinkClick = useCallback(link => {
    setSelectedLinkForEdit(link);
    setSelectedNodeForEdit(null); // Reset selected node
  }, []);

  const handleZoomOut = useCallback(() => {
    // Reset camera to a default zoomed-out position
    setCameraView(
      { x: 0, y: 0, z: 500 }, // A reasonable default position
      { x: 0, y: 0, z: 0 },   // Look at the center
      { x: 0, y: 1, z: 0 },   // Default up vector
      1,                      // Default zoom
      false,                  // Default to perspective camera
      3000                    // Transition duration
    );
  }, []);

  // Camera control functions
  const setCameraView = useCallback((position, lookAt, up, zoom, isOrthographic, duration = 2000) => {
    const camera = graphRef.current.camera();
    const controls = graphRef.current.controls();

    // Set camera position and lookAt target
    graphRef.current.cameraPosition(position, lookAt, duration);

    // Set up vector
    if (up) {
      camera.up.set(up.x, up.y, up.z);
    }

    // Set zoom level
    if (zoom) {
      camera.zoom = zoom;
    }

    // Set projection mode
    if (isOrthographic !== undefined) {
      if (isOrthographic && !(camera instanceof THREE.OrthographicCamera)) {
        // Convert to OrthographicCamera
        const aspect = camera.aspect || (window.innerWidth / window.innerHeight);
        const frustumSize = camera.far - camera.near;
        const newCamera = new THREE.OrthographicCamera(
          -frustumSize * aspect / 2,
          frustumSize * aspect / 2,
          frustumSize / 2,
          -frustumSize / 2,
          camera.near,
          camera.far
        );
        newCamera.position.copy(camera.position);
        newCamera.quaternion.copy(camera.quaternion);
        newCamera.zoom = camera.zoom; // Preserve zoom
        graphRef.current.camera(newCamera);
      } else if (!isOrthographic && !(camera instanceof THREE.PerspectiveCamera)) {
        // Convert to PerspectiveCamera
        const newCamera = new THREE.PerspectiveCamera(
          camera.fov,
          camera.aspect,
          camera.near,
          camera.far
        );
        newCamera.position.copy(camera.position);
        newCamera.quaternion.copy(camera.quaternion);
        newCamera.zoom = camera.zoom; // Preserve zoom
        graphRef.current.camera(newCamera);
      }
    }

    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  const setPresetView = useCallback((viewType) => {
    const distance = 400;
    const views = {
      top: { pos: { x: 0, y: distance, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      bottom: { pos: { x: 0, y: -distance, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      front: { pos: { x: 0, y: 0, z: distance }, lookAt: { x: 0, y: 0, z: 0 } },
      back: { pos: { x: 0, y: 0, z: -distance }, lookAt: { x: 0, y: 0, z: 0 } },
      left: { pos: { x: -distance, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      right: { pos: { x: distance, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      isometric: { pos: { x: distance * 0.7, y: distance * 0.7, z: distance * 0.7 }, lookAt: { x: 0, y: 0, z: 0 } },
    };
    const view = views[viewType];
    if (view) {
      setCameraView(view.pos, view.lookAt, undefined, undefined, undefined);
    }
  }, [setCameraView]);

  const saveBookmark = useCallback(() => {
    if (!bookmarkName.trim()) {
      alert('Please enter a bookmark name');
      return;
    }
    const camera = graphRef.current.camera();
    const bookmark = {
      name: bookmarkName,
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      lookAt: { x: graphRef.current.controls().target.x, y: graphRef.current.controls().target.y, z: graphRef.current.controls().target.z },
      up: { x: camera.up.x, y: camera.up.y, z: camera.up.z },
      zoom: camera.zoom,
      isOrthographic: camera.isOrthographicCamera,
    };
    setCameraBookmarks(prev => [...prev, bookmark]);
    setBookmarkName('');
    alert(`Bookmark "${bookmarkName}" saved!`);
  }, [bookmarkName]);

  const loadBookmark = useCallback((bookmark) => {
    setCameraView(bookmark.position, bookmark.lookAt, bookmark.up, bookmark.zoom, bookmark.isOrthographic);
  }, [setCameraView]);

  const deleteBookmark = useCallback((indexToDelete) => {
    setCameraBookmarks(prev => prev.filter((_, index) => index !== indexToDelete));
  }, []);

  const importBookmarks = useCallback((file) => {
    if (!file) {
      alert("Please select a JSON file to load bookmarks.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedBookmarks = JSON.parse(e.target.result);
        if (!Array.isArray(loadedBookmarks) || !loadedBookmarks.every(b => b.name && b.position && b.lookAt && b.up && b.zoom !== undefined)) {
          throw new Error("Invalid bookmark file format.");
        }
        setCameraBookmarks(loadedBookmarks.map(b => ({ ...b, isOrthographic: b.isOrthographic !== undefined ? b.isOrthographic : false })));
        setSelectedBookmarkFileForLoad(null);
        alert(`Loaded ${loadedBookmarks.length} camera bookmarks!`);
      } catch (error) {
        console.error("Error loading bookmarks:", error);
        alert(`Error loading bookmarks: ${error.message}. Please ensure it's a valid JSON file with the correct format.`);
      }
    };
    reader.readAsText(file);
  }, []);

  const exportBookmarks = useCallback(() => {
    if (cameraBookmarks.length === 0) {
      alert("No bookmarks to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(cameraBookmarks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'camera_bookmarks.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Camera bookmarks exported to camera_bookmarks.json!");
  }, [cameraBookmarks]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-120);
      graphRef.current.d3Force('link').distance(link => link.distance || 50);
      graphRef.current.d3Force('center', null); // Disable centering force
    }
  }, []);

  useEffect(() => {
    if (autoRotate && graphRef.current) {
      autoRotateRef.current = setInterval(() => {
        const currentCamera = graphRef.current.camera();
        setCameraView(
          {
            x: currentCamera.position.x * Math.cos(0.005 * rotationSpeed) - currentCamera.position.z * Math.sin(0.005 * rotationSpeed),
            y: currentCamera.position.y,
            z: currentCamera.position.z * Math.cos(0.005 * rotationSpeed) + currentCamera.position.x * Math.sin(0.005 * rotationSpeed),
          },
          { x: 0, y: 0, z: 0 }, // Look at center
          { x: currentCamera.up.x, y: currentCamera.up.y, z: currentCamera.up.z }, // Preserve current up vector
          currentCamera.zoom, // Preserve current zoom
          currentCamera.isOrthographicCamera, // Preserve current projection mode
          0 // No transition duration
        );
      }, 10);
    } else {
      clearInterval(autoRotateRef.current);
    }
    return () => clearInterval(autoRotateRef.current);
  }, [autoRotate, rotationSpeed]);

  return (
    <div className="relative h-screen w-screen bg-black text-white">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="id"
        nodeAutoColorBy="group"
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.id);
          sprite.color = node.color || 'white';
          sprite.textHeight = node.textSize || 6;
          return sprite;
        }}
        linkWidth={link => link.thickness || 1}
        linkColor={link => {
          const color = link.color || '#F0F0F0';
          // Force full opacity for all links
          if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, 1)`;
          } else if (color.startsWith('rgb(')) {
            const parts = color.match(/\d+/g);
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 1)`;
          } else if (color.startsWith('rgba(')) {
            const parts = color.match(/\d+/g);
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 1)`;
          }
          return 'rgba(240, 240, 240, 1)'; // Default fallback to opaque white
        }}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeDragEnd={onNodeDragEnd}
        backgroundColor="#000000"
      />

      {/* Controls Panel */}
      {showControls && (
        <div className="absolute top-4 left-4 z-10 w-[20%] min-w-[150px] sm:w-80 max-h-[90vh] overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                3D Node Graph
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowControls(false)}
                >
                  Hide
                </Button>
              </CardTitle>
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
                <Button onClick={handleLoadFile} size="sm" className="w-full">
                  Load File
                </Button>
                {selectedFileForLoad && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFileForLoad.name}
                  </p>
                )}
                
                <Separator className="my-3" />
                
                <Label>Save Filename</Label>
                <Input
                  type="text"
                  placeholder="Enter filename"
                  value={loadedFileName}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Ensure .json extension
                    if (value && !value.endsWith('.json')) {
                      value = value.replace(/\.[^.]*$/, '') + '.json';
                    }
                    setLoadedFileName(value || 'graphData.json');
                  }}
                  onBlur={(e) => {
                    // Add .json if missing when user leaves the field
                    let value = e.target.value.trim();
                    if (value && !value.endsWith('.json')) {
                      setLoadedFileName(value + '.json');
                    } else if (!value) {
                      setLoadedFileName('graphData.json');
                    }
                  }}
                />
                <Button onClick={saveGraphData} size="sm" className="w-full">
                  Save JSON
                </Button>
                
                <Button onClick={handleNewGraph} variant="outline" size="sm" className="w-full">
                  New Graph
                </Button>
              </div>

              <Separator />

              {/* Add Node */}
              <div className="space-y-2">
                <Label>Add Node</Label>
                <Input
                  placeholder="Node ID"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                />
                <Button onClick={addNode} size="sm" className="w-full">
                  Add Node
                </Button>
                
                {/* Bring closer to functionality */}
                {graphData.nodes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs">Bring closer to</Label>
                    <Select
                      value={selectedNodeToPull || ''}
                      onValueChange={(value) => setSelectedNodeToPull(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target node" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphData.nodes.map(node => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Delete Node */}
              {graphData.nodes.length > 0 && (
                <div className="space-y-2">
                  <Label>Delete Node</Label>
                  <Select
                    value={selectedNodeForEdit?.id || ''}
                    onValueChange={(value) => {
                      const node = graphData.nodes.find(n => n.id === value);
                      setSelectedNodeForEdit(node || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select node to delete" />
                    </SelectTrigger>
                    <SelectContent>
                      {graphData.nodes.map(node => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => {
                      if (selectedNodeForEdit) {
                        if (window.confirm(`Are you sure you want to delete node "${selectedNodeForEdit.id}"? This will also remove all connected links.`)) {
                          deleteNode(selectedNodeForEdit.id);
                        }
                      } else {
                        alert('Please select a node to delete');
                      }
                    }} 
                    size="sm" 
                    className="w-full"
                    variant="destructive"
                    disabled={!selectedNodeForEdit}
                  >
                    Delete Node
                  </Button>
                </div>
              )}

              {graphData.nodes.length > 0 && <Separator />}

              {/* Add Link */}
              <div className="space-y-2">
                <Label>Create Link Between Nodes</Label>
                {graphData.nodes.length < 2 ? (
                  <p className="text-sm text-muted-foreground">Need at least 2 nodes to create a link</p>
                ) : (
                  <>
                    {/* Method 1: Dropdown Selection */}
                    {!isLinkSelectionMode && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">From Node</Label>
                          <Select
                            value={selectedNodes[0] || ''}
                            onValueChange={(value) => {
                              setSelectedNodes(prev => [value, prev[1] || '']);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select source node" />
                            </SelectTrigger>
                            <SelectContent>
                              {graphData.nodes.map(node => (
                                <SelectItem key={node.id} value={node.id}>
                                  {node.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">To Node</Label>
                          <Select
                            value={selectedNodes[1] || ''}
                            onValueChange={(value) => {
                              setSelectedNodes(prev => [prev[0] || '', value]);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select target node" />
                            </SelectTrigger>
                            <SelectContent>
                              {graphData.nodes
                                .filter(node => node.id !== selectedNodes[0])
                                .map(node => (
                                  <SelectItem key={node.id} value={node.id}>
                                    {node.id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => {
                              if (selectedNodes.length === 2 && selectedNodes[0] && selectedNodes[1]) {
                                addLink();
                              } else {
                                alert("Please select both source and target nodes");
                              }
                            }} 
                            size="sm" 
                            className="w-full"
                            disabled={!selectedNodes[0] || !selectedNodes[1]}
                          >
                            Create Link
                          </Button>
                          <Button 
                            onClick={startLinkSelection} 
                            size="sm" 
                            className="w-full"
                            variant="outline"
                          >
                            Or Click Nodes
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Method 2: Click on Nodes */}
                    {isLinkSelectionMode && (
                      <>
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Click Mode Active</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Click on two nodes in the 3D graph to connect them
                          </p>
                          <div className="text-sm">
                            Selected: {selectedNodes.filter(n => n).join(" → ") || "None"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={addLink} 
                            size="sm" 
                            className="flex-1"
                            disabled={selectedNodes.length !== 2 || !selectedNodes[0] || !selectedNodes[1]}
                          >
                            Create Link
                          </Button>
                          <Button 
                            onClick={cancelLinkSelection} 
                            size="sm" 
                            className="flex-1"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <Separator />

              {/* Focus Mode and Zoom Out Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => setIsFocusMode(prev => !prev)}
                  size="sm"
                  className="w-full"
                  variant={isFocusMode ? "default" : "outline"}
                >
                  {isFocusMode ? "Focus Mode: ON" : "Focus Mode: OFF"}
                </Button>
                <Button onClick={handleZoomOut} size="sm" className="w-full" variant="outline">
                  Zoom Out
                </Button>
              </div>

              <Separator />

              {/* OG Mode and Camera Controls Toggle */}
              <div className="space-y-2">
                <Button onClick={() => setShowOGMode(prev => !prev)} size="sm" className="w-full">
                  {showOGMode ? "Hide OG Mode" : "Show OG Mode"}
                </Button>
                <Button onClick={() => setShowCameraControls(prev => !prev)} size="sm" className="w-full" variant="outline">
                  {showCameraControls ? "Hide Camera Controls" : "Show Camera Controls"}
                </Button>
              </div>

              <Separator />

              {/* Stats */}
              <div className="text-sm text-muted-foreground">
                Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* OG Mode Panel */}
      {showOGMode && (
        <div className="absolute top-4 right-4 z-10 w-[21%] min-w-[140px] sm:w-64 max-h-[80vh] overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                OG Mode
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOGMode(false)}
                >
                  Hide
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Load OG.json File</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedFileForLoad(e.target.files[0])}
                />
                <Button onClick={handleLoadOGFile} size="sm" className="w-full">
                  Load OG.json
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button onClick={recordOGPositions} size="sm" className="w-full">
                  Record OG Positions
                </Button>
                <Button onClick={saveOGPositions} size="sm" className="w-full">
                  Save OG.json
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Recorded OG Positions: {recordedOGPositions.nodes.length} nodes, {recordedOGPositions.links.length} links
              </div>
              
              <Separator />
              
              {/* Remaining Fund Section */}
              <div className="space-y-2 pt-2">
                <div className="bg-black border-red-600 border-2 rounded-lg p-2 sm:p-4">
                  <h3 className="text-red-600 text-sm sm:text-xl font-bold mb-1 sm:mb-3">Remaining Fund</h3>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="text-[10px] sm:text-sm text-muted-foreground">
                      White Nodes: {graphData.nodes.filter(node => {
                        const color = (node.color || '').toLowerCase();
                        return color === '#ffffff' || color === '#fff' || color === 'white';
                      }).length}
                    </div>
                    <Separator />
                    <div className="text-lg sm:text-3xl font-bold text-red-600 text-center py-2 sm:py-4">
                      {(graphData.nodes.filter(node => {
                        const color = (node.color || '').toLowerCase();
                        return color === '#ffffff' || color === '#fff' || color === 'white';
                      }).length * 100).toLocaleString()} QAR
                    </div>
                    <div className="text-[8px] sm:text-xs text-muted-foreground text-center">
                      The Amount
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Camera Controls Panel */}
      {showCameraControls && (
        <div className="absolute bottom-4 left-4 z-10 w-[20%] min-w-[150px] sm:w-80 max-h-[80vh] overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Camera Controls
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCameraControls(false)}
                >
                  Hide
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Views */}
              <div className="space-y-2">
                <Label>Preset Views</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setPresetView('top')} size="sm" variant="outline">
                    Top
                  </Button>
                  <Button onClick={() => setPresetView('bottom')} size="sm" variant="outline">
                    Bottom
                  </Button>
                  <Button onClick={() => setPresetView('front')} size="sm" variant="outline">
                    Front
                  </Button>
                  <Button onClick={() => setPresetView('back')} size="sm" variant="outline">
                    Back
                  </Button>
                  <Button onClick={() => setPresetView('left')} size="sm" variant="outline">
                    Left
                  </Button>
                  <Button onClick={() => setPresetView('right')} size="sm" variant="outline">
                    Right
                  </Button>
                  <Button onClick={() => setPresetView('isometric')} size="sm" variant="outline" className="col-span-2">
                    Isometric
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Auto-Rotate */}
              <div className="space-y-2">
                <Label>Auto-Rotate</Label>
                <Button
                  onClick={() => setAutoRotate(prev => !prev)}
                  size="sm"
                  className="w-full"
                  variant={autoRotate ? "default" : "outline"}
                >
                  {autoRotate ? "Stop Rotation" : "Start Rotation"}
                </Button>
                {autoRotate && (
                  <div className="space-y-2">
                    <Label>Rotation Speed: {rotationSpeed}x</Label>
                    <Slider
                      value={[rotationSpeed]}
                      onValueChange={(value) => setRotationSpeed(value[0])}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Camera Bookmarks */}
              <div className="space-y-2">
                <Label>Camera Bookmarks</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Bookmark name"
                    value={bookmarkName}
                    onChange={(e) => setBookmarkName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={saveBookmark} size="sm">
                    Save
                  </Button>
                </div>
                <Button onClick={exportBookmarks} size="sm" className="w-full">
                  Export Bookmarks
                </Button>

                <Separator className="my-3" />

                <Label>Load Bookmarks File</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedBookmarkFileForLoad(e.target.files[0])}
                />
                <Button onClick={() => importBookmarks(selectedBookmarkFileForLoad)} size="sm" className="w-full">
                  Load Bookmarks
                </Button>
                {selectedBookmarkFileForLoad && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedBookmarkFileForLoad.name}
                  </p>
                )}

                {cameraBookmarks.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {cameraBookmarks.map((bookmark, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Button
                          onClick={() => loadBookmark(bookmark)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          {bookmark.name}
                        </Button>
                        <Button
                          onClick={() => deleteBookmark(index)}
                          size="sm"
                          variant="destructive"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {cameraBookmarks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No bookmarks saved</p>
                )}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <Button onClick={handleZoomOut} size="sm" className="w-full" variant="outline">
                  Reset to Default View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!showControls && (
        <Button
          className="absolute top-4 left-4 z-10"
          onClick={() => setShowControls(true)}
        >
          Show Controls
        </Button>
      )}

      {/* Property Editor Panel */}
      {selectedNodeForEdit && (
        <div className="absolute bottom-4 right-4 z-10 w-[14%] min-w-[105px] sm:w-56 max-h-[80vh] overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Edit Node: {selectedNodeForEdit.id}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextNode}
                  >
                    Next Node
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNodeForEdit(null);
                      setSelectedLinkForEdit(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Node Properties */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button onClick={handleCopyNodeStyle} size="sm" variant="outline" className="flex-1">
                    Copy Node Style
                  </Button>
                  <Button onClick={handleApplyNodeStyle} size="sm" variant="outline" className="flex-1" disabled={!copiedNodeStyle}>
                    Apply Node Style
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Node Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={selectedNodeForEdit.color || '#1A75FF'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setGraphData(prev => ({
                          ...prev,
                          nodes: prev.nodes.map(n =>
                            n.id === selectedNodeForEdit.id ? { ...n, color: newColor } : n
                          )
                        }));
                        setSelectedNodeForEdit(prev => ({ ...prev, color: newColor }));
                      }}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-muted-foreground">{selectedNodeForEdit.color || '#1A75FF'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Size: {selectedNodeForEdit.textSize || 6}</Label>
                  <Slider
                    value={[selectedNodeForEdit.textSize || 6]}
                    onValueChange={(value) => {
                      const newSize = value[0];
                      setGraphData(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n =>
                          n.id === selectedNodeForEdit.id ? { ...n, textSize: newSize } : n
                        )
                      }));
                      setSelectedNodeForEdit(prev => ({ ...prev, textSize: newSize }));
                    }}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <Separator />

              {/* Link Properties */}
              <div className="space-y-3">
                <Label>Connected Links</Label>
                {(() => {
                  const connectedLinks = graphData.links.filter(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return sourceId === selectedNodeForEdit.id || targetId === selectedNodeForEdit.id;
                  });

                  if (connectedLinks.length === 0) {
                    return <p className="text-sm text-muted-foreground">No connected links</p>;
                  }

                  return (
                    <>
                      <Select
                        value={selectedLinkForEdit ? `${typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source}-${typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}` : ''}
                        onValueChange={(value) => {
                          const link = connectedLinks.find(l => {
                            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                            return `${sourceId}-${targetId}` === value;
                          });
                          setSelectedLinkForEdit(link);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a link to edit" />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedLinks.map((link, index) => {
                            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                            return (
                              <SelectItem key={index} value={`${sourceId}-${targetId}`}>
                                {sourceId} → {targetId}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {selectedLinkForEdit && (
                        <div className="space-y-3 mt-3">
                          <div className="flex gap-2 mb-3">
                            <Button onClick={handleCopyLinkStyle} size="sm" variant="outline" className="flex-1">
                              Copy Link Style
                            </Button>
                            <Button onClick={handleApplyLinkStyle} size="sm" variant="outline" className="flex-1" disabled={!copiedLinkStyle}>
                              Apply Link Style
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Link Color</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="color"
                                value={selectedLinkForEdit.color || '#F0F0F0'}
                                onChange={(e) => {
                                  const newColor = e.target.value;
                                  setGraphData(prev => ({
                                    ...prev,
                                    links: prev.links.map(l => {
                                      const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                                      const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                                      const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                                      const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                                      return (lSourceId === sSourceId && lTargetId === sTargetId)
                                        ? { ...l, color: newColor }
                                        : l;
                                    })
                                  }));
                                  setSelectedLinkForEdit(prev => ({ ...prev, color: newColor }));
                                }}
                                className="w-20 h-10"
                              />
                              <span className="text-sm text-muted-foreground">{selectedLinkForEdit.color || '#F0F0F0'}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Thickness: {selectedLinkForEdit.thickness || 1}</Label>
                            <Slider
                              value={[selectedLinkForEdit.thickness || 1]}
                              onValueChange={(value) => {
                                const newThickness = value[0];
                                setGraphData(prev => ({
                                  ...prev,
                                  links: prev.links.map(l => {
                                    const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                                    const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                                    const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                                    const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                                    return (lSourceId === sSourceId && lTargetId === sTargetId)
                                      ? { ...l, thickness: newThickness }
                                      : l;
                                  })
                                }));
                                setSelectedLinkForEdit(prev => ({ ...prev, thickness: newThickness }));
                              }}
                              min={0.1}
                              max={10}
                              step={0.1}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Link Property Editor Panel */}
      {selectedLinkForEdit && !selectedNodeForEdit && (
        <div className="absolute bottom-4 right-4 z-10 w-80">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Edit Link: {typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} → {typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedLinkForEdit(null);
                    setSelectedNodeForEdit(null);
                  }}
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-3">
                <Button onClick={handleCopyLinkStyle} size="sm" variant="outline" className="flex-1">
                  Copy Link Style
                </Button>
                <Button onClick={handleApplyLinkStyle} size="sm" variant="outline" className="flex-1" disabled={!copiedLinkStyle}>
                  Apply Link Style
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Link Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={selectedLinkForEdit.color || '#F0F0F0'}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setGraphData(prev => ({
                        ...prev,
                        links: prev.links.map(l => {
                          const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                          const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                          const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                          const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                          return (lSourceId === sSourceId && lTargetId === sTargetId)
                            ? { ...l, color: newColor }
                            : l;
                        })
                      }));
                      setSelectedLinkForEdit(prev => ({ ...prev, color: newColor }));
                    }}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-muted-foreground">{selectedLinkForEdit.color || '#F0F0F0'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thickness: {selectedLinkForEdit.thickness || 1}</Label>
                <Slider
                  value={[selectedLinkForEdit.thickness || 1]}
                  onValueChange={(value) => {
                    const newThickness = value[0];
                    setGraphData(prev => ({
                      ...prev,
                      links: prev.links.map(l => {
                        const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                        const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                        const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                        const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                        return (lSourceId === sSourceId && lTargetId === sTargetId)
                          ? { ...l, thickness: newThickness }
                          : l;
                      })
                    }));
                    setSelectedLinkForEdit(prev => ({ ...prev, thickness: newThickness }));
                  }}
                  min={0.1}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default App;


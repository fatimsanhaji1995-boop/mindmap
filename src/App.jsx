
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import FloatablePanel from '@/components/FloatablePanel.jsx';
import RegistrationForm from '@/components/RegistrationForm.jsx';
import { getDescendants, filterGraphByCollapsedNodes, toggleNodeCollapse, isNodeCollapsed } from '@/lib/collapseUtils';
import './App.css';

function App() {
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeGroup, setNewNodeGroup] = useState('general');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [recordedOGPositions, setRecordedOGPositions] = useState({ nodes: [], links: [] });
  const [showControls, setShowControls] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showDeleteNode, setShowDeleteNode] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);

  // Dynamic panel positioning logic
  const getPanelX = (panelId) => {
    const panelOrder = ['add-node', 'delete-node', 'add-link', 'node-editor', 'link-editor'];
    const panelStates = {
      'add-node': showAddNode,
      'delete-node': showDeleteNode,
      'add-link': showAddLink,
      'node-editor': !!selectedNodeForEdit,
      'link-editor': !!selectedLinkForEdit && !selectedNodeForEdit
    };
    
    let visibleCountBefore = 0;
    for (const id of panelOrder) {
      if (id === panelId) break;
      if (panelStates[id]) visibleCountBefore++;
    }
    
    return 20 + (visibleCountBefore * (window.innerWidth * 0.2 + 20));
  };

  const [selectedFileForLoad, setSelectedFileForLoad] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false); // New state for focus mode
  const [isLinkSelectionMode, setIsLinkSelectionMode] = useState(false); // Mode for selecting nodes to create links
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState(null); // Node selected for property editing
  const [selectedLinkForEdit, setSelectedLinkForEdit] = useState(null); // Link selected for property editing
  const [copiedNodeStyle, setCopiedNodeStyle] = useState(null); // State to store copied node style
  const [copiedLinkStyle, setCopiedLinkStyle] = useState(null); // State to store copied link style
  const [pullDistance, setPullDistance] = useState(50); // Percentage to pull node closer (0-100%)
  const [selectedNodeToPull, setSelectedNodeToPull] = useState(null); // Node to pull closer to selected node
  const [collapsedNodes, setCollapsedNodes] = useState(new Set()); // Track collapsed nodes for branch hiding
  const [collapseMode, setCollapseMode] = useState(false); // Toggle mode for collapse/expand
  
  // Camera control states
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [cameraBookmarks, setCameraBookmarks] = useState([]);
  const [bookmarkName, setBookmarkName] = useState('');
  const [selectedBookmarkFileForLoad, setSelectedBookmarkFileForLoad] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageType, setAuthMessageType] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [graphId, setGraphId] = useState('default-graph');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleLines, setConsoleLines] = useState([
    'MindMap Console initialized.',
    'Type `help` to list commands.',
  ]);
  const [hiddenGroups, setHiddenGroups] = useState(new Set());
  const autoRotateRef = useRef(null);

  const normalizeGraphData = useCallback((data) => ({
    nodes: (data.nodes || []).map(node => ({
      ...node,
      color: node.color || '#1A75FF',
      textSize: node.textSize || 6,
    })),
    links: (data.links || []).map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
      color: link.color || '#F0F0F0',
      thickness: link.thickness || 1,
    })),
  }), []);


  const getCleanGraphData = useCallback(() => ({
    nodes: graphData.nodes.map(({ id, color, textSize, group, x, y, z }) => ({
      id, color, textSize, group, x, y, z,
    })),
    links: graphData.links.map(({ source, target, color, thickness }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
    })),
  }), [graphData]);

  const getNodeGroupLabel = useCallback((groupValue) => {
    const normalized = typeof groupValue === 'string' ? groupValue.trim() : '';
    return normalized || 'ungrouped';
  }, []);

  const groupNames = useMemo(() => {
    const unique = new Set(graphData.nodes.map((node) => getNodeGroupLabel(node.group)));
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [graphData.nodes, getNodeGroupLabel]);

  const visibleGraphData = useMemo(() => {
    if (!hiddenGroups.size) {
      return graphData;
    }

    const visibleNodes = graphData.nodes.filter((node) => !hiddenGroups.has(getNodeGroupLabel(node.group)));
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    return {
      nodes: visibleNodes,
      links: graphData.links.filter((link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      }),
    };
  }, [graphData, hiddenGroups, getNodeGroupLabel]);

  const normalizeOGSnapshot = useCallback((snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') {
      return { nodes: [], links: [] };
    }

    const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const links = Array.isArray(snapshot.links) ? snapshot.links : [];

    return {
      nodes: nodes.map(({ id, x, y, z }) => ({ id, x, y, z })),
      links: links.map(({ source, target, color, thickness }) => ({
        source: typeof source === 'object' ? source.id : source,
        target: typeof target === 'object' ? target.id : target,
        color,
        thickness,
      })),
    };
  }, []);

  const normalizeCameraBookmarks = useCallback((bookmarks) => {
    if (!Array.isArray(bookmarks)) {
      return [];
    }

    return bookmarks
      .filter((bookmark) => bookmark && typeof bookmark === 'object')
      .map((bookmark, index) => ({
        name: bookmark.name || `view-${index + 1}`,
        position: {
          x: bookmark.position?.x ?? 0,
          y: bookmark.position?.y ?? 0,
          z: bookmark.position?.z ?? 400,
        },
        lookAt: {
          x: bookmark.lookAt?.x ?? 0,
          y: bookmark.lookAt?.y ?? 0,
          z: bookmark.lookAt?.z ?? 0,
        },
        up: {
          x: bookmark.up?.x ?? 0,
          y: bookmark.up?.y ?? 1,
          z: bookmark.up?.z ?? 0,
        },
        zoom: bookmark.zoom ?? 1,
        isOrthographic: Boolean(bookmark.isOrthographic),
      }));
  }, []);


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

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          setCurrentUser(null);
          return;
        }
        const payload = await response.json();
        setCurrentUser(payload.user);
        setAuthMessage(`Signed in as ${payload.user.email}`);
        setAuthMessageType('success');
      } catch {
        setCurrentUser(null);
      }
    };

    checkSession();
  }, []);

  const getCleanGraphData = useCallback(() => ({
    nodes: graphData.nodes.map(({ id, color, textSize, group, x, y, z }) => ({
      id, color, textSize, group, x, y, z,
    })),
    links: graphData.links.map(({ source, target, color, thickness }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
    })),
  }), [graphData]);

  const validateAuthInputs = () => {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateAuthInputs()) {
      return;
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || 'Failed to login.');
      return;
    }

    setCurrentUser(payload.user);
    setPassword('');
    alert(`Logged in as ${payload.user.email}`);
  };

  const handleRegister = async () => {
    if (!validateAuthInputs()) {
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
  }, [groupNames]);

    if (response.status === 409) {
      alert('Email already exists. Please log in instead.');
      return;
    }

    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || 'Failed to register.');
      return;
    }

    setCurrentUser(payload.user);
    setPassword('');
    window.location.assign('/dashboard');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
    setPassword('');
    setAuthMessage('Logged out.');
    setAuthMessageType('info');
  };

  const saveGraphToCloud = async () => {
    if (!graphId.trim()) {
      if (!silent) alert('Please enter a graph id.');
      return false;
    }

    setIsSavingCloud(true);
    try {
      const response = await fetch(`/api/graphs/${encodeURIComponent(graphId.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: {
            ...getCleanGraphData(),
            ogSnapshot: normalizeOGSnapshot(recordedOGPositions),
            cameraBookmarks: normalizeCameraBookmarks(cameraBookmarks),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        if (!silent) alert(payload.error || 'Failed to save graph to cloud.');
        return false;
      }

      if (!silent) alert(`Graph saved to cloud: ${payload.graph.id}`);
      return true;
    } catch {
      if (!silent) alert('Network error while saving graph.');
      return false;
    } finally {
      setIsSavingCloud(false);
    }
  };

  const loadGraphFromCloud = async () => {
    if (!graphId.trim()) {
      if (!silent) alert('Please enter a graph id.');
      return false;
    }

    setIsLoadingCloud(true);
    try {
      const response = await fetch(`/api/graphs/${encodeURIComponent(graphId.trim())}`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok) {
        if (!silent) alert(payload.error || 'Failed to load graph from cloud.');
        return false;
      }

      const normalized = normalizeGraphData(payload.graph.data);
      setGraphData(normalized);
      setRecordedOGPositions(normalizeOGSnapshot(payload.graph.data?.ogSnapshot));
      setCameraBookmarks(normalizeCameraBookmarks(payload.graph.data?.cameraBookmarks));
      if (!silent) alert(`Loaded graph ${payload.graph.id} from cloud.`);
      return true;
    } catch {
      if (!silent) alert('Network error while loading graph.');
      return false;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleLoadFile = () => {
    if (!selectedFileForLoad) {
      alert('Please select a JSON file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        const normalizedData = normalizeGraphData(data);
        setGraphData(normalizedData);
        alert(`Loaded ${normalizedData.nodes.length} nodes and ${normalizedData.links.length} links successfully!`);
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

  const appendConsoleLine = (line) => {
    setConsoleLines((prev) => [...prev, line].slice(-120));
  };

  const fetchGraphCatalog = async () => {
    const response = await fetch('/api/graphs', { method: 'GET', credentials: 'include' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to list graphs.');
    }

    return payload.graphs || [];
  };

  const runConsoleCommand = async (rawCommand) => {
    const command = rawCommand.trim();
    if (!command) {
      return;
    }

    appendConsoleLine(`] ${command}`);
    const [action, ...rest] = command.split(/\s+/);

    if (action === 'help') {
      appendConsoleLine('Commands: help, clear, new, set <graphId>, save, load, list, groups list|hide|show|toggle|showall, og record|save|load, camera capture|list|load|delete|save|sync, focus, collapse, zoomout, toggle <panel>.');
      appendConsoleLine('Panels: add-node, delete-node, add-link, controls.');
      return;
    }

    if (action === 'clear') {
      setConsoleLines(['MindMap Console cleared.']);
      return;
    }

    if (action === 'new') {
      handleNewGraph();
      appendConsoleLine('Created a new empty graph.');
      return;
    }

    if (action === 'set') {
      const newGraphId = rest.join(' ').trim();
      if (!newGraphId) {
        appendConsoleLine('Usage: set <graphId>');
        return;
      }

      setGraphId(newGraphId);
      appendConsoleLine(`Active graph id set to: ${newGraphId}`);
      return;
    }

    if (action === 'save') {
      const ok = await saveGraphToCloud({ silent: true });
      appendConsoleLine(ok ? `Saved graph: ${graphId}` : `Save failed for graph: ${graphId}`);
      return;
    }

    if (action === 'load') {
      const ok = await loadGraphFromCloud({ silent: true });
      appendConsoleLine(ok ? `Loaded graph: ${graphId}` : `Load failed for graph: ${graphId}`);
      return;
    }

    if (action === 'list') {
      try {
        const graphs = await fetchGraphCatalog();
        if (!graphs.length) {
          appendConsoleLine('No graphs found in database.');
          return;
        }
        appendConsoleLine(`Found ${graphs.length} graph(s):`);
        graphs.forEach((graph) => appendConsoleLine(`- ${graph.id} (${new Date(graph.updated_at).toLocaleString()})`));
      } catch (error) {
        appendConsoleLine(error.message || 'Failed to list graphs.');
      }
      return;
    }

    if (action === 'groups') {
      const sub = rest[0];
      const groupName = rest.slice(1).join(' ').trim();

      if (!sub || sub === 'list') {
        if (!groupNames.length) {
          appendConsoleLine('No groups found in current graph.');
          return;
        }
        appendConsoleLine(`Groups (${groupNames.length}):`);
        groupNames.forEach((name) => {
          appendConsoleLine(`- ${name} [${hiddenGroups.has(name) ? 'hidden' : 'visible'}]`);
        });
        return;
      }

      if (sub === 'showall') {
        showAllGroups();
        appendConsoleLine('All groups are now visible.');
        return;
      }

      if (!groupName) {
        appendConsoleLine('Usage: groups list | groups hide <name> | groups show <name> | groups toggle <name> | groups showall');
        return;
      }

      if (!groupNames.includes(groupName)) {
        appendConsoleLine(`Unknown group: ${groupName}`);
        return;
      }

      if (sub === 'hide') {
        setHiddenGroups((prev) => new Set(prev).add(groupName));
        appendConsoleLine(`Group hidden: ${groupName}`);
        return;
      }

      if (sub === 'show') {
        setHiddenGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });
        appendConsoleLine(`Group visible: ${groupName}`);
        return;
      }

      if (sub === 'toggle') {
        const currentlyHidden = hiddenGroups.has(groupName);
        toggleGroupVisibility(groupName);
        appendConsoleLine(`Group ${currentlyHidden ? 'visible' : 'hidden'}: ${groupName}`);
        return;
      }

      appendConsoleLine('Usage: groups list | groups hide <name> | groups show <name> | groups toggle <name> | groups showall');
      return;
    }

    if (action === 'og') {
      const sub = rest[0];
      if (sub === 'record') {
        recordOGPositions();
        appendConsoleLine('Recorded OG snapshot from current fixed node positions.');
        return;
      }
      if (sub === 'save') {
        const ok = await saveOGToDatabase({ silent: true });
        appendConsoleLine(ok ? `Saved OG snapshot for graph: ${graphId}` : `Failed to save OG snapshot for graph: ${graphId}`);
        return;
      }
      if (sub === 'load') {
        const ok = await loadOGFromDatabase({ silent: true });
        appendConsoleLine(ok ? `Loaded OG snapshot for graph: ${graphId}` : `Failed to load OG snapshot for graph: ${graphId}`);
        return;
      }
      appendConsoleLine('Usage: og record | og save | og load');
      return;
    }


    if (action === 'camera') {
      const sub = rest[0];
      const arg = rest.slice(1).join(' ').trim();

      if (sub === 'capture') {
        const camera = graphRef.current?.camera();
        const controls = graphRef.current?.controls();
        if (!camera || !controls) {
          appendConsoleLine('Camera unavailable.');
          return;
        }

        const name = arg || cameraBookmarkName || `view-${cameraBookmarks.length + 1}`;
        const bookmark = {
          name,
          position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          lookAt: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
          up: { x: camera.up.x, y: camera.up.y, z: camera.up.z },
          zoom: camera.zoom,
          isOrthographic: camera.isOrthographicCamera,
        };

        setCameraBookmarks((prev) => {
          const others = prev.filter((entry) => entry.name !== name);
          return [...others, bookmark];
        });
        setCameraBookmarkName(name);
        appendConsoleLine(`Captured camera bookmark: ${name}`);
        return;
      }

      if (sub === 'list') {
        if (!cameraBookmarks.length) {
          appendConsoleLine('No camera bookmarks recorded.');
          return;
        }
        cameraBookmarks.forEach((bookmark, index) => appendConsoleLine(`${index + 1}. ${bookmark.name}`));
        return;
      }

      if (sub === 'load') {
        if (!arg) {
          appendConsoleLine('Usage: camera load <name>');
          return;
        }
        const bookmark = cameraBookmarks.find((entry) => entry.name === arg);
        if (!bookmark) {
          appendConsoleLine(`Bookmark not found: ${arg}`);
          return;
        }
        setCameraView(bookmark.position, bookmark.lookAt, bookmark.up, bookmark.zoom, bookmark.isOrthographic);
        appendConsoleLine(`Loaded camera bookmark: ${bookmark.name}`);
        return;
      }

      if (sub === 'delete') {
        if (!arg) {
          appendConsoleLine('Usage: camera delete <name>');
          return;
        }
        setCameraBookmarks((prev) => prev.filter((entry) => entry.name !== arg));
        appendConsoleLine(`Deleted camera bookmark (if existed): ${arg}`);
        return;
      }

      if (sub === 'save') {
        const ok = await saveGraphToCloud({ silent: true });
        appendConsoleLine(ok ? `Saved camera bookmarks to DB for graph: ${graphId}` : `Failed to save camera bookmarks for graph: ${graphId}`);
        return;
      }

      if (sub === 'sync') {
        const ok = await loadGraphFromCloud({ silent: true });
        appendConsoleLine(ok ? `Synced camera bookmarks from DB for graph: ${graphId}` : `Failed to sync camera bookmarks for graph: ${graphId}`);
        return;
      }

      appendConsoleLine('Usage: camera capture <name> | camera list | camera load <name> | camera delete <name> | camera save | camera sync');
      return;
    }

    if (action === 'zoomout') {
      handleZoomOut();
      appendConsoleLine('Camera reset to default view.');
      return;
    }

    if (action === 'focus') {
      setIsFocusMode((prev) => {
        const next = !prev;
        appendConsoleLine(`Focus mode: ${next ? 'ON' : 'OFF'}`);
        return next;
      });
      return;
    }

    if (action === 'collapse') {
      setCollapseMode((prev) => {
        const next = !prev;
        appendConsoleLine(`Collapse mode: ${next ? 'ON' : 'OFF'}`);
        return next;
      });
      return;
    }

    if (action === 'toggle') {
      const panel = rest[0];
      const toggles = {
        'add-node': () => setShowAddNode((prev) => !prev),
        'delete-node': () => setShowDeleteNode((prev) => !prev),
        'add-link': () => setShowAddLink((prev) => !prev),
        controls: () => setShowControls((prev) => !prev),
      };

      if (!toggles[panel]) {
        appendConsoleLine('Unknown panel. Use: add-node, delete-node, add-link, controls.');
        return;
      }

      toggles[panel]();
      appendConsoleLine(`Toggled panel: ${panel}`);
      return;
    }

    appendConsoleLine(`Unknown command: ${action}. Type help.`);
  };

  const submitConsoleCommand = async () => {
    const command = consoleInput;
    setConsoleInput('');
    await runConsoleCommand(command);
  };


    const applyOGSnapshotToGraph = useCallback((snapshot) => {
    const normalizedSnapshot = normalizeOGSnapshot(snapshot);

    if (!normalizedSnapshot.nodes.length) {
      return false;
    }

    setGraphData((prevGraphData) => {
      const newNodes = prevGraphData.nodes.map((node) => {
        const ogNode = normalizedSnapshot.nodes.find((candidate) => candidate.id === node.id);
        if (!ogNode) {
          return node;
        }

        return {
          ...node,
          x: ogNode.x,
          y: ogNode.y,
          z: ogNode.z,
          fx: ogNode.x,
          fy: ogNode.y,
          fz: ogNode.z,
        };
      });

      return {
        ...prevGraphData,
        nodes: newNodes,
        links: normalizedSnapshot.links.length ? normalizedSnapshot.links : prevGraphData.links,
      };
    });

    setRecordedOGPositions(normalizedSnapshot);
    return true;
  }, [normalizeOGSnapshot]);

  const saveOGToDatabase = async ({ silent = false } = {}) => {
    const hasSnapshot = recordedOGPositions.nodes.length > 0 || recordedOGPositions.links.length > 0;
    if (!hasSnapshot) {
      if (!silent) alert('No OG positions to save. Please record OG positions first.');
      return false;
    }

    const ok = await saveGraphToCloud({ silent });
    if (ok && !silent) {
      alert(`OG snapshot saved to database for graph: ${graphId}`);
    }

    return ok;
  };

  const loadOGFromDatabase = async ({ silent = false } = {}) => {
    if (!graphId.trim()) {
      if (!silent) alert('Please enter a graph id.');
      return false;
    }

    try {
      const response = await fetch(`/api/graphs/${encodeURIComponent(graphId.trim())}`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok) {
        if (!silent) alert(payload.error || 'Failed to load OG snapshot from database.');
        return false;
      }

      const applied = applyOGSnapshotToGraph(payload.graph.data?.ogSnapshot);
      if (!applied) {
        if (!silent) alert(`No OG snapshot saved for graph ${payload.graph.id}.`);
        return false;
      }

      if (!silent) alert(`Loaded OG snapshot from database for graph: ${payload.graph.id}`);
      return true;
    } catch {
      if (!silent) alert('Network error while loading OG snapshot.');
      return false;
    }
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
      group: getNodeGroupLabel(newNodeGroup),
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
    setNewNodeGroup((prev) => prev || 'general');
    
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

  const onNodeDragEnd = useCallback(node => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;

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
  }, [graphData.nodes, graphData.links]);

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

  const handleNodeClick = useCallback((node, event) => {
    // Check if Ctrl+Click (or Cmd+Click on Mac) for collapse/expand
    if ((event && (event.ctrlKey || event.metaKey)) || collapseMode) {
      // Toggle collapse state for this node
      const newCollapsed = toggleNodeCollapse(node.id, collapsedNodes);
      setCollapsedNodes(newCollapsed);
      return;
    }
    
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
  }, [isFocusMode, isLinkSelectionMode, collapseMode, collapsedNodes]);

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


  useEffect(() => {
    const handleGlobalKeydown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }

      const activeTag = document.activeElement?.tagName;
      const isTypingField = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (isTypingField) {
        return;
      }

      event.preventDefault();
      setShowConsole((prev) => !prev);
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  // Filter graph data based on collapsed nodes
  const displayGraphData = filterGraphByCollapsedNodes(visibleGraphData, collapsedNodes);

  return (
    <div className="relative h-screen w-screen bg-black text-white">
      <ForceGraph3D
        ref={graphRef}
        graphData={displayGraphData}
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

{/* Modular Control Panels */}
      {showFileOps && (
        <FloatablePanel
          id="file-ops-panel"
          title="File Operations"
          defaultPosition={{ x: getPanelX("file-ops"), y: 80 }}
          defaultSize={{ width: window.innerWidth * 0.18, height: 'auto' }}
          minWidth={250}
          minHeight={300}
          onClose={() => setShowFileOps(false)}
        >
          <div className="space-y-4">
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
                
                <Button onClick={handleNewGraph} variant="outline" size="sm" className="w-full">
                  New Graph
                </Button>

                <Separator className="my-3" />

                <Label>Cloud Account</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use these same fields for both Register and Login. Register signs you in automatically.
                </p>

                {!currentUser ? (
                  <div className="space-y-3">
                    <Button onClick={() => handleAuth('login')} size="sm" className="w-full">Login</Button>
                    <RegistrationForm onRegistered={(user) => {
                      setCurrentUser(user);
                      setEmail(user?.email || '');
                      setPassword('');
                    }} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Signed in as {currentUser.email}</p>
                    <Button onClick={handleLogout} size="sm" variant="outline" className="w-full">Logout</Button>
                  </div>
                )}

                <Label>Cloud Graph ID</Label>
                <Input
                  type="text"
                  placeholder="default-graph"
                  value={graphId}
                  onChange={(e) => setGraphId(e.target.value)}
                />
                <Button onClick={loadGraphFromCloud} size="sm" className="w-full" disabled={isLoadingCloud}>
                  {isLoadingCloud ? 'Loading from Vercel DB...' : 'Load from Vercel DB'}
                </Button>
                <Button onClick={saveGraphToCloud} size="sm" className="w-full" disabled={isSavingCloud}>
                  {isSavingCloud ? 'Saving to Vercel DB...' : 'Save to Vercel DB'}
                </Button>
              </div>
          </div>
        </FloatablePanel>
      )}

      {showAddNode && (
        <FloatablePanel
          id="add-node-panel"
          title="Add Node"
          defaultPosition={{ x: getPanelX("add-node"), y: 80 }}
          defaultSize={{ width: window.innerWidth * 0.18, height: 'auto' }}
          minWidth={250}
          minHeight={200}
          onClose={() => setShowAddNode(false)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
                <Label>Add Node</Label>
                <Input
                  placeholder="Node ID"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                />
                <Input
                  placeholder="Group label (e.g. project-alpha)"
                  value={newNodeGroup}
                  onChange={(e) => setNewNodeGroup(e.target.value)}
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
          </div>
        </FloatablePanel>
      )}

      {showDeleteNode && (
        <FloatablePanel
          id="delete-node-panel"
          title="Delete Node"
          defaultPosition={{ x: getPanelX("delete-node"), y: 80 }}
          defaultSize={{ width: window.innerWidth * 0.18, height: 'auto' }}
          minWidth={250}
          minHeight={150}
          onClose={() => setShowDeleteNode(false)}
        >
          <div className="space-y-4">
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
          </div>
        </FloatablePanel>
      )}

      {showAddLink && (
        <FloatablePanel
          id="add-link-panel"
          title="Create Link"
          defaultPosition={{ x: getPanelX("add-link"), y: 80 }}
          defaultSize={{ width: window.innerWidth * 0.18, height: 'auto' }}
          minWidth={250}
          minHeight={350}
          onClose={() => setShowAddLink(false)}
        >
          <div className="space-y-4">
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
          </div>
        </FloatablePanel>
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
        <FloatablePanel
          id="node-editor-panel"
          title={`Edit Node: ${selectedNodeForEdit.id}`}
          defaultPosition={{ x: getPanelX("node-editor"), y: 80 }}
          defaultSize={{ width: 280, height: 'auto' }}
          onClose={() => {
            setSelectedNodeForEdit(null);
            setSelectedLinkForEdit(null);
          }}
        >
          <div className="space-y-4">
            <Button onClick={handleNextNode} size="sm" variant="outline" className="w-full">Next Node</Button>
            <div className="flex gap-2">
              <Button onClick={handleCopyNodeStyle} size="sm" variant="outline" className="flex-1">Copy Style</Button>
              <Button onClick={handleApplyNodeStyle} size="sm" variant="outline" className="flex-1" disabled={!copiedNodeStyle}>Apply Style</Button>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input type="color" value={selectedNodeForEdit.color || '#1A75FF'} onChange={(e) => {
                const newColor = e.target.value;
                setGraphData(prev => ({...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, color: newColor } : n)}));
                setSelectedNodeForEdit(prev => ({ ...prev, color: newColor }));
              }} />
            </div>
            <div className="space-y-2">
              <Label>Text Size: {selectedNodeForEdit.textSize || 6}</Label>
              <Slider
                value={[selectedNodeForEdit.textSize || 6]}
                onValueChange={(value) => {
                  const newSize = value[0];
                  setGraphData(prev => ({...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, textSize: newSize } : n)}));
                  setSelectedNodeForEdit(prev => ({ ...prev, textSize: newSize }));
                }}
                min={1} max={20} step={1} className="w-full"
              />
            </div>
          </div>
        </FloatablePanel>
      )}

      {/* Link Property Editor Panel */}
      {selectedLinkForEdit && !selectedNodeForEdit && (
        <FloatablePanel
          id="link-editor-panel"
          title="Edit Link"
          defaultPosition={{ x: getPanelX("link-editor"), y: 80 }}
          defaultSize={{ width: 280, height: 'auto' }}
          onClose={() => setSelectedLinkForEdit(null)}
        >
          <div className="space-y-4">
            <div className="text-sm font-medium">
              {typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} → {typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input type="color" value={selectedLinkForEdit.color || '#F0F0F0'} onChange={(e) => {
                const newColor = e.target.value;
                setGraphData(prev => ({...prev, links: prev.links.map(l => {
                  const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                  const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                  const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                  const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                  return (lSourceId === sSourceId && lTargetId === sTargetId) ? { ...l, color: newColor } : l;
                })}));
                setSelectedLinkForEdit(prev => ({ ...prev, color: newColor }));
              }} />
            </div>
            <div className="space-y-2">
              <Label>Thickness: {selectedLinkForEdit.thickness || 1}</Label>
              <Slider
                value={[selectedLinkForEdit.thickness || 1]}
                onValueChange={(value) => {
                  const newThickness = value[0];
                  setGraphData(prev => ({...prev, links: prev.links.map(l => {
                    const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                    const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                    const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                    return (lSourceId === sSourceId && lTargetId === sTargetId) ? { ...l, thickness: newThickness } : l;
                  })}));
                  setSelectedLinkForEdit(prev => ({ ...prev, thickness: newThickness }));
                }}
                min={0.1} max={10} step={0.1} className="w-full"
              />
            </div>
          </div>
        </FloatablePanel>
      )}
      {/* Master Toggle Menu */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex max-w-[95vw] flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-zinc-500/70 bg-zinc-900/70 p-3 shadow-2xl backdrop-blur-md">
        <Button className="text-base px-4 py-2 h-auto" variant={showConsole ? "default" : "outline"} onClick={() => setShowConsole(prev => !prev)}>Console</Button>
        <Button className="text-base px-4 py-2 h-auto" variant={showAddNode ? "default" : "outline"} onClick={() => setShowAddNode(prev => !prev)}>+ Node</Button>
        <Button className="text-base px-4 py-2 h-auto" variant={showDeleteNode ? "default" : "outline"} onClick={() => setShowDeleteNode(prev => !prev)}>- Node</Button>
        <Button className="text-base px-4 py-2 h-auto" variant={showAddLink ? "default" : "outline"} onClick={() => setShowAddLink(prev => !prev)}>Link</Button>
        </div>
        {groupNames.length > 0 && (
          <div className="flex max-w-[95vw] flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-600/70 bg-black/40 px-3 py-2 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-wide text-zinc-300">Groups</span>
            {groupNames.map((groupName) => {
              const isVisible = !hiddenGroups.has(groupName);
              return (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => toggleGroupVisibility(groupName)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${isVisible ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-100' : 'border-zinc-500 bg-zinc-900/80 text-zinc-400 line-through'}`}
                >
                  {groupName}
                </button>
              );
            })}
            <button
              type="button"
              onClick={showAllGroups}
              className="rounded-full border border-zinc-400 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700/60"
            >
              Show all
            </button>
          </div>
        )}
        <p className="text-xs text-zinc-300 bg-black/50 px-2 py-1 rounded">Mobile: use the Console button to toggle the panel.</p>
      </div>
    </div>
  );
}

export default App;

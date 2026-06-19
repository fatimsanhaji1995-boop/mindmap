
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
import CyberpunkDashboard from '@/components/CyberpunkDashboard.jsx';
import RegistrationForm from '@/components/RegistrationForm.jsx';
import { getDescendants, filterGraphByCollapsedNodes, toggleNodeCollapse, isNodeCollapsed } from '@/lib/collapseUtils';
import { parseClipboardData, createNodesFromPaste } from '@/lib/clipboardUtils';
import './App.css';

// Creates a THREE.Sprite with neon glow — glassmorphic capsule design
const _spriteCache = new Map();
const _textureCache = new Map();
function makeCyberpunkSprite(text, color = '#00ff41', textHeight = 6, isTimeline = false) {
  const cacheKey = `${text}||${color}||${textHeight}||${isTimeline}`;
  if (_spriteCache.has(cacheKey)) return _spriteCache.get(cacheKey).clone();

  const fontSize = 42;
  const font = `bold ${fontSize}px "Segoe UI", "Inter", -apple-system, sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(text).width);
  
  const padX = 22;
  const padY = 12;
  const w = textW + padX * 2;
  const h = fontSize + padY * 2;
  
  canvas.width  = w + 24; // Extra space for drop shadow
  canvas.height = h + 24;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  // Set subtle drop shadow for the capsule pill to float off the 3D space
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  // Draw sleek borderless dark frosted glass background
  ctx.fillStyle = 'rgba(15, 15, 18, 0.88)';
  const r = h / 2;
  ctx.beginPath();
  ctx.arc(cx - w/2 + r, cy - h/2 + r, r, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(cx + w/2 - r, cy - h/2);
  ctx.arc(cx + w/2 - r, cy - h/2 + r, r, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  
  // Draw text with sharp typography and a subtle shadow for contrast
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy);
  
  const texture  = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite   = new THREE.Sprite(material);
  const aspect   = canvas.width / canvas.height;
  const scaleH   = textHeight * 1.8;
  sprite.scale.set(aspect * scaleH, scaleH, 1);
  
  _spriteCache.set(cacheKey, sprite);
  return sprite.clone();
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUARTER_MONTHS = { full:[0,1,2,3,4,5,6,7,8,9,10,11], Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };

const LINK_TYPES = {
  wire:   { label: 'Wire',   color: 'rgba(0, 243, 255, 0.25)', width: 0.8, particles: 1, particleSpeed: 0.002, particleWidth: 1.2, particleColor: '#00ffff' },
  stream: { label: 'Stream', color: '#00ffff', width: 1.5, particles: 3, particleSpeed: 0.005, particleWidth: 2, particleColor: '#00ffff' },
  pulse:  { label: 'Pulse',  color: '#ff007f', width: 2.5, particles: 5, particleSpeed: 0.01, particleWidth: 2.5, particleColor: '#ff007f' },
  ghost:  { label: 'Ghost',  color: 'rgba(255, 255, 255, 0.06)', width: 0.4, particles: 0, particleSpeed: 0,     particleWidth: 0, particleColor: '#334455' },
};

const PRESET_COLORS = [
  { name: 'Emerald', value: '#00ff41' },
  { name: 'Electric Cyan', value: '#00ffff' },
  { name: 'Vibrant Pink', value: '#ff007f' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Royal Blue', value: '#1A75FF' },
  { name: 'Neon Purple', value: '#8a2be2' },
  { name: 'Vibrant Orange', value: '#ff4500' },
  { name: 'Coral Red', value: '#ff6b6b' },
  { name: 'Sleek White', value: '#f0f0f0' },
];

function App() {
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeGroup, setNewNodeGroup] = useState('general');
  const [connectedNodeId, setConnectedNodeId] = useState('');
  const [connectedLinkType, setConnectedLinkType] = useState('wire');
  const [newLinkType, setNewLinkType] = useState('wire');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [recordedOGPositions, setRecordedOGPositions] = useState({ nodes: [], links: [] });
  const [showControls, setShowControls] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showDeleteNode, setShowDeleteNode] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showFileOps, setShowFileOps] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [navigatorSearch, setNavigatorSearch] = useState('');
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [timelineGranularity, setTimelineGranularity] = useState('month');
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear());
  const [timelineRange, setTimelineRange] = useState('full');
  const [timelineSpacingY, setTimelineSpacingY] = useState(200);

  // Database Selector States
  const [isDatabaseSelected, setIsDatabaseSelected] = useState(false);
  const [dbCatalog, setDbCatalog] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [newDbId, setNewDbId] = useState('');

  // Dynamic panel positioning logic
  const getPanelX = (panelId) => {
    const panelOrder = ['file-ops', 'navigator', 'add-node', 'delete-node', 'add-link', 'timeline', 'node-editor', 'link-editor'];
    const panelStates = {
      'file-ops': showFileOps,
      'navigator': showNavigator,
      'add-node': showAddNode,
      'delete-node': showDeleteNode,
      'add-link': showAddLink,
      'timeline': showTimeline,
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
  const [cameraBookmarkName, setCameraBookmarkName] = useState('');
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
  const consoleOutputRef = useRef(null);
  const bloomRef = useRef(null);
  const [inlineNodeMode, setInlineNodeMode] = useState(false);
  const [inlineNodeText, setInlineNodeText] = useState('');
  const [inlineNodePos, setInlineNodePos] = useState({ x: 0, y: 0, z: 0 });

  const normalizeGraphData = useCallback((data) => ({
    nodes: (data.nodes || []).map(node => ({
      ...node,
      color: node.color || '#1A75FF',
      textSize: node.textSize || 6,
      // Re-pin timeline nodes and any node that had fx/fy/fz saved
      ...(node.nodeType === 'timeline'
        ? { fx: node.fx ?? node.x, fy: node.fy ?? node.y, fz: node.fz ?? node.z }
        : node.fx !== undefined
          ? { fx: node.fx, fy: node.fy, fz: node.fz }
          : {}),
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
    nodes: graphData.nodes.map(({ id, color, textSize, group, x, y, z, fx, fy, fz, nodeType, amount, date }) => ({
      id, color, textSize, group, x, y, z, nodeType, amount, date,
      ...(fx !== undefined ? { fx, fy, fz } : {}),
    })),
    links: graphData.links.map(({ source, target, color, thickness, linkType }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
      linkType,
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

  const toggleGroupVisibility = useCallback((groupName) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const showAllGroups = useCallback(() => {
    setHiddenGroups(new Set());
  }, []);

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


  // Load database catalog on mount and whenever the user logs in/out
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const list = await fetchGraphCatalog();
        setDbCatalog(list);
      } catch (err) {
        console.error('Failed to load database catalog:', err);
        setCatalogError(err.message || 'Failed to retrieve list of databases');
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [currentUser]);

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

  const validateAuthInputs = () => {
    if (!email || !password) {
      appendConsoleLine('Please enter both email and password.');
      return false;
    }

    return true;
  };

  const handleAuth = async (mode) => {
    if (!validateAuthInputs()) {
      return;
    }

    setIsAuthLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (mode === 'register' && response.status === 409) {
        appendConsoleLine('Email already exists. Please log in instead.');
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        appendConsoleLine(payload.error || `Failed to ${mode}.`);
        return;
      }

      setCurrentUser(payload.user);
      setPassword('');
      appendConsoleLine(`${mode === 'login' ? 'Logged in' : 'Registered'} as ${payload.user.email}`);
      
      if (mode === 'register') {
        setShowDashboard(true);
      }
    } catch (error) {
      appendConsoleLine(`Network error during ${mode}.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = () => handleAuth('login');
  const handleRegister = () => handleAuth('register');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
    setPassword('');
    setAuthMessage('Logged out.');
    setAuthMessageType('info');
  };

  const saveGraphToCloud = async ({ silent = false } = {}) => {
    if (!graphId.trim()) {
      if (!silent) appendConsoleLine('Please enter a graph id.');
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
        if (!silent) appendConsoleLine(payload.error || 'Failed to save graph to cloud.');
        return false;
      }

      if (!silent) appendConsoleLine(`Graph saved to cloud: ${payload.graph.id}`);
      return true;
    } catch {
      if (!silent) appendConsoleLine('Network error while saving graph.');
      return false;
    } finally {
      setIsSavingCloud(false);
    }
  };

  const loadGraphFromCloud = async ({ silent = false } = {}) => {
    if (!graphId.trim()) {
      if (!silent) appendConsoleLine('Please enter a graph id.');
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
        if (!silent) appendConsoleLine(payload.error || 'Failed to load graph from cloud.');
        return false;
      }

      const normalized = normalizeGraphData(payload.graph.data);
      setGraphData(normalized);
      setRecordedOGPositions(normalizeOGSnapshot(payload.graph.data?.ogSnapshot));
      setCameraBookmarks(normalizeCameraBookmarks(payload.graph.data?.cameraBookmarks));
      if (!silent) appendConsoleLine(`Loaded graph ${payload.graph.id} from cloud.`);
      return true;
    } catch {
      if (!silent) appendConsoleLine('Network error while loading graph.');
      return false;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleSelectDatabase = async (id) => {
    setIsLoadingCloud(true);
    try {
      const response = await fetch(`/api/graphs/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || 'Failed to load graph.');
        return;
      }
      setGraphId(id);
      const normalized = normalizeGraphData(payload.graph.data);
      setGraphData(normalized);
      setRecordedOGPositions(normalizeOGSnapshot(payload.graph.data?.ogSnapshot));
      setCameraBookmarks(normalizeCameraBookmarks(payload.graph.data?.cameraBookmarks));
      setIsDatabaseSelected(true);
      appendConsoleLine(`Connected to database: ${id}`);
    } catch (err) {
      console.error(err);
      alert('Network error while loading graph.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleCreateDatabase = async () => {
    const id = newDbId.trim();
    if (!id) {
      alert('Please enter a database name.');
      return;
    }
    if (dbCatalog.some(db => db.id.toLowerCase() === id.toLowerCase())) {
      alert('A database with this name already exists. Please choose a different name.');
      return;
    }

    setGraphId(id);
    setGraphData({ nodes: [], links: [] });
    setRecordedOGPositions({ nodes: [], links: [] });
    setCameraBookmarks([]);
    setIsDatabaseSelected(true);
    appendConsoleLine(`Initialized new database: ${id}`);

    try {
      await fetch(`/api/graphs/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph: {
            id,
            data: { nodes: [], links: [], ogSnapshot: { nodes: [], links: [] }, cameraBookmarks: [] }
          }
        }),
        credentials: 'include',
      });
      const updatedList = await fetchGraphCatalog();
      setDbCatalog(updatedList);
    } catch (err) {
      console.error('Failed to pre-register database:', err);
    }
  };

  const handleStartSandbox = () => {
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
    setGraphId('sandbox-mode');
    setGraphData(sampleData);
    setRecordedOGPositions({ nodes: [], links: [] });
    setCameraBookmarks([]);
    setIsDatabaseSelected(true);
  };

  const handleExitDatabase = () => {
    if (window.confirm('Are you sure you want to disconnect and exit this database? Ensure your changes are saved.')) {
      setIsDatabaseSelected(false);
      setGraphId('default-graph');
      setGraphData({ nodes: [], links: [] });
      setRecordedOGPositions({ nodes: [], links: [] });
      setCameraBookmarks([]);
      setSelectedNodeForEdit(null);
      setSelectedLinkForEdit(null);
      appendConsoleLine('Disconnected from database.');
    }
  };

  const handleLoadFile = () => {
    if (!selectedFileForLoad) {
      appendConsoleLine('Please select a JSON file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        const normalizedData = normalizeGraphData(data);
        setGraphData(normalizedData);
        appendConsoleLine(`Loaded ${normalizedData.nodes.length} nodes and ${normalizedData.links.length} links successfully!`);
        setSelectedFileForLoad(null);
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        appendConsoleLine('Error parsing JSON file. Please ensure it is valid JSON.');
      }
    };
    reader.readAsText(selectedFileForLoad);
  };

  const handleNewGraph = () => {
    setGraphData({ nodes: [], links: [] });
    setSelectedFileForLoad(null);
  };

  const appendConsoleLine = useCallback((line) => {
    setConsoleLines((prev) => [...prev, line].slice(-120));
  }, []);

  useEffect(() => {
    if (consoleOutputRef.current) {
      consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const fetchGraphCatalog = async () => {
    const response = await fetch('/api/graphs', { method: 'GET', credentials: 'include' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to list graphs.');
    }

    return payload.graphs || [];
  };

  const handleTabCompletion = useCallback(async () => {
    const input = consoleInput;
    const trimmed = input.trimStart();
    const parts = trimmed.split(/\s+/);
    const trailingSpace = input.endsWith(' ');
    const action = parts[0]?.toLowerCase() || '';

    const ALL_COMMANDS = ['help', 'clear', 'new', 'set', 'save', 'load', 'list', 'groups', 'og', 'camera', 'zoomout', 'focus', 'collapse', 'toggle'];

    let candidates = [];
    let prefix = '';
    let baseInput = '';

    if (parts.length === 1 && !trailingSpace) {
      prefix = action;
      baseInput = '';
      candidates = ALL_COMMANDS.filter(c => c.startsWith(prefix));
    } else if (action === 'camera') {
      const CAMERA_SUBS = ['capture', 'list', 'load', 'delete', 'save', 'sync'];
      if (parts.length === 1 && trailingSpace) {
        baseInput = 'camera '; candidates = CAMERA_SUBS;
      } else if (parts.length === 2 && !trailingSpace) {
        prefix = parts[1].toLowerCase(); baseInput = 'camera ';
        candidates = CAMERA_SUBS.filter(s => s.startsWith(prefix));
      } else if (parts.length >= 2 && (parts[1] === 'load' || parts[1] === 'delete')) {
        prefix = trailingSpace ? '' : parts.slice(2).join(' ');
        baseInput = `camera ${parts[1]} `;
        candidates = cameraBookmarks.map(b => b.name).filter(n => n.startsWith(prefix));
      }
    } else if (action === 'groups') {
      const GROUPS_SUBS = ['list', 'hide', 'show', 'toggle', 'showall'];
      if (parts.length === 1 && trailingSpace) {
        baseInput = 'groups '; candidates = GROUPS_SUBS;
      } else if (parts.length === 2 && !trailingSpace) {
        prefix = parts[1].toLowerCase(); baseInput = 'groups ';
        candidates = GROUPS_SUBS.filter(s => s.startsWith(prefix));
      } else if (parts.length >= 2 && ['hide', 'show', 'toggle'].includes(parts[1])) {
        prefix = trailingSpace ? '' : parts.slice(2).join(' ');
        baseInput = `groups ${parts[1]} `;
        candidates = groupNames.filter(n => n.startsWith(prefix));
      }
    } else if (action === 'og') {
      const OG_SUBS = ['record', 'save', 'load'];
      if (parts.length === 1 && trailingSpace) {
        baseInput = 'og '; candidates = OG_SUBS;
      } else if (parts.length === 2 && !trailingSpace) {
        prefix = parts[1].toLowerCase(); baseInput = 'og ';
        candidates = OG_SUBS.filter(s => s.startsWith(prefix));
      }
    } else if (action === 'toggle') {
      const PANELS = ['add-node', 'delete-node', 'add-link', 'controls'];
      if (parts.length === 1 && trailingSpace) {
        baseInput = 'toggle '; candidates = PANELS;
      } else if (parts.length === 2 && !trailingSpace) {
        prefix = parts[1].toLowerCase(); baseInput = 'toggle ';
        candidates = PANELS.filter(p => p.startsWith(prefix));
      }
    } else if (action === 'set' || action === 'load') {
      prefix = (parts.length === 2 && !trailingSpace) ? parts[1] : '';
      baseInput = `${action} `;
      if (parts.length <= 2) {
        try {
          const graphs = await fetchGraphCatalog();
          candidates = graphs.map(g => g.id).filter(id => id.startsWith(prefix));
        } catch (e) {}
      }
    }

    if (candidates.length === 0) return;

    if (candidates.length === 1) {
      setConsoleInput(baseInput + candidates[0]);
    } else {
      appendConsoleLine(`  ${candidates.join('   ')}`);
      const commonPrefix = candidates.reduce((acc, c) => {
        let i = 0;
        while (i < acc.length && i < c.length && acc[i] === c[i]) i++;
        return acc.slice(0, i);
      });
      if (commonPrefix.length > prefix.length) {
        setConsoleInput(baseInput + commonPrefix);
      }
    }
  }, [consoleInput, cameraBookmarks, groupNames, appendConsoleLine]);

  const generateTimeline = useCallback(() => {
    const monthIndices = QUARTER_MONTHS[timelineRange] || QUARTER_MONTHS.full;
    const newNodes = [];
    const newLinks = [];
    const existingIds = new Set(graphData.nodes.map(n => n.id));

    if (timelineGranularity === 'month') {
      const spacing = 160;
      monthIndices.forEach((mIdx, i) => {
        const id = `${MONTHS[mIdx]} ${timelineYear}`;
        if (existingIds.has(id)) return;
        const x = i * spacing;
        newNodes.push({ id, color: '#FFD700', textSize: 10, group: 'timeline', nodeType: 'timeline', x, y: timelineSpacingY, z: 0, fx: x, fy: timelineSpacingY, fz: 0 });
      });
    } else {
      // Week granularity — generate ~4 weeks per month in selected range
      const spacing = 100;
      let idx = 0;
      monthIndices.forEach(mIdx => {
        for (let w = 1; w <= 4; w++) {
          const id = `${MONTHS[mIdx]} W${w} ${timelineYear}`;
          if (existingIds.has(id)) return;
          const x = idx * spacing;
          newNodes.push({ id, color: '#FFD700', textSize: 8, group: 'timeline', nodeType: 'timeline', x, y: timelineSpacingY, z: 0, fx: x, fy: timelineSpacingY, fz: 0 });
          idx++;
        }
      });
    }

    // Connect consecutive time nodes with Ghost links so the spine is visible
    for (let i = 0; i < newNodes.length - 1; i++) {
      newLinks.push({ source: newNodes[i].id, target: newNodes[i + 1].id, color: LINK_TYPES.ghost.color, thickness: LINK_TYPES.ghost.width, linkType: 'ghost' });
    }

    if (newNodes.length === 0) {
      appendConsoleLine('All timeline nodes already exist — nothing added.');
      return;
    }

    setGraphData(prev => ({ nodes: [...prev.nodes, ...newNodes], links: [...prev.links, ...newLinks] }));
    appendConsoleLine(`Generated ${newNodes.length} ${timelineGranularity} nodes for ${timelineYear} (${timelineRange}).`);
  }, [timelineGranularity, timelineYear, timelineRange, timelineSpacingY, graphData.nodes, appendConsoleLine]);

  const runConsoleCommand = async (rawCommand) => {
    const command = rawCommand.trim();
    if (!command) {
      return;
    }

    appendConsoleLine(`] ${command}`);
    const [rawAction, ...rest] = command.split(/\s+/);
    const action = rawAction.toLowerCase();

    if (action === 'help') {
      appendConsoleLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      appendConsoleLine(' AVAILABLE COMMANDS');
      appendConsoleLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      appendConsoleLine('help                        → show this command list');
      appendConsoleLine('clear                       → clear the console');
      appendConsoleLine('new                         → create a new empty graph');
      appendConsoleLine('set <graphId>               → set the active graph ID');
      appendConsoleLine('save                        → save current graph to cloud');
      appendConsoleLine('load                        → load current graph from cloud');
      appendConsoleLine('list                        → list all graphs in database');
      appendConsoleLine('── GROUPS ───────────────────────────');
      appendConsoleLine('groups list                 → list all groups + visibility');
      appendConsoleLine('groups hide <name>          → hide a group');
      appendConsoleLine('groups show <name>          → show a group');
      appendConsoleLine('groups toggle <name>        → toggle group visibility');
      appendConsoleLine('groups showall              → make all groups visible');
      appendConsoleLine('── OG SNAPSHOT ──────────────────────');
      appendConsoleLine('og record                   → record snapshot from current positions');
      appendConsoleLine('og save                     → save OG snapshot to database');
      appendConsoleLine('og load                     → load OG snapshot from database');
      appendConsoleLine('── CAMERA ───────────────────────────');
      appendConsoleLine('camera capture [name]       → capture a camera bookmark');
      appendConsoleLine('camera list                 → list all camera bookmarks');
      appendConsoleLine('camera load <name>          → restore a camera bookmark');
      appendConsoleLine('camera delete <name>        → delete a camera bookmark');
      appendConsoleLine('camera save                 → save bookmarks to database');
      appendConsoleLine('camera sync                 → sync bookmarks from database');
      appendConsoleLine('── VIEW ─────────────────────────────');
      appendConsoleLine('zoomout                     → reset camera to default view');
      appendConsoleLine('focus                       → toggle focus mode on/off');
      appendConsoleLine('collapse                    → toggle collapse mode on/off');
      appendConsoleLine('── PANELS ───────────────────────────');
      appendConsoleLine('toggle add-node             → toggle Add Node panel');
      appendConsoleLine('toggle delete-node          → toggle Delete Node panel');
      appendConsoleLine('toggle add-link             → toggle Add Link panel');
      appendConsoleLine('toggle controls             → toggle Controls panel');
      appendConsoleLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
      const sub = rest[0]?.toLowerCase();
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
      const sub = rest[0]?.toLowerCase();
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
      const sub = rest[0]?.toLowerCase();
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
      if (!silent) appendConsoleLine('No OG positions to save. Please record OG positions first.');
      return false;
    }

    const ok = await saveGraphToCloud({ silent });
    if (ok && !silent) {
      appendConsoleLine(`OG snapshot saved to database for graph: ${graphId}`);
    }

    return ok;
  };

  const loadOGFromDatabase = async ({ silent = false } = {}) => {
    if (!graphId.trim()) {
      if (!silent) appendConsoleLine('Please enter a graph id.');
      return false;
    }

    try {
      const response = await fetch(`/api/graphs/${encodeURIComponent(graphId.trim())}`, {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json();
      if (!response.ok) {
        if (!silent) appendConsoleLine(payload.error || 'Failed to load OG snapshot from database.');
        return false;
      }

      const applied = applyOGSnapshotToGraph(payload.graph.data?.ogSnapshot);
      if (!applied) {
        if (!silent) appendConsoleLine(`No OG snapshot saved for graph ${payload.graph.id}.`);
        return false;
      }

      if (!silent) appendConsoleLine(`Loaded OG snapshot from database for graph: ${payload.graph.id}`);
      return true;
    } catch {
      if (!silent) appendConsoleLine('Network error while loading OG snapshot.');
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
      appendConsoleLine("Please select both source and target nodes to create a link.");
      return;
    }

    const [source, target] = selectedNodes;

    if (graphData.links.some(link => {
      const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
      const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
      return (linkSource === source && linkTarget === target) || (linkSource === target && linkTarget === source);
    })) {
      appendConsoleLine("Link between these two nodes already exists.");
      return;
    }

    const lt = LINK_TYPES[newLinkType] || LINK_TYPES.wire;
    const newLink = {
      source,
      target,
      color: lt.color,
      thickness: lt.width,
      linkType: newLinkType,
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
      appendConsoleLine("Please select a target node");
      return;
    }

    const nodeToMove = graphData.nodes.find(n => n.id === selectedNodeForEdit.id);
    const targetNode = graphData.nodes.find(n => n.id === selectedNodeToPull);

    if (!nodeToMove || !targetNode) {
      appendConsoleLine("Could not find selected nodes");
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

    appendConsoleLine(`Moved ${selectedNodeForEdit.id} ${pullDistance}% closer to ${selectedNodeToPull}`);
  };

  const addNode = () => {
    const camera = graphRef.current.camera();
    const cameraPos = camera.position;
    const cameraDir = camera.getWorldDirection(new THREE.Vector3());

    if (!newNodeId.trim()) {
      appendConsoleLine('Please enter a node ID');
      return;
    }
    if (graphData.nodes.find(node => node.id === newNodeId.trim())) {
      appendConsoleLine('Node with this ID already exists');
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

  const addConnectedNode = useCallback(() => {
    const newId = connectedNodeId.trim();
    if (!newId) { appendConsoleLine('Enter a name for the new node.'); return; }
    if (!selectedNodeForEdit) { appendConsoleLine('No node selected.'); return; }
    if (graphData.nodes.find(n => n.id === newId)) { appendConsoleLine(`Node "${newId}" already exists.`); return; }

    const parent = graphData.nodes.find(n => n.id === selectedNodeForEdit.id);
    const offset = 40;
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
    const pos = {
      x: (parent?.x || 0) + Math.cos(angle) * Math.cos(elevation) * offset,
      y: (parent?.y || 0) + Math.sin(elevation) * offset,
      z: (parent?.z || 0) + Math.sin(angle) * Math.cos(elevation) * offset,
    };

    const lt = LINK_TYPES[connectedLinkType] || LINK_TYPES.wire;
    const newNode = { id: newId, color: '#1A75FF', textSize: 6, group: selectedNodeForEdit.group, ...pos, fx: pos.x, fy: pos.y, fz: pos.z };
    const newLink = { source: selectedNodeForEdit.id, target: newId, color: lt.color, thickness: lt.width, linkType: connectedLinkType };

    setGraphData(prev => ({
      nodes: [...prev.nodes, newNode],
      links: [...prev.links, newLink],
    }));

    appendConsoleLine(`Created node "${newId}" linked to "${selectedNodeForEdit.id}".`);
    setConnectedNodeId('');
  }, [connectedNodeId, selectedNodeForEdit, graphData.nodes, appendConsoleLine]);

  const deleteNode = (nodeId) => {
    if (!nodeId) {
      appendConsoleLine('Please select a node to delete');
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

    appendConsoleLine(`Node ${nodeId} and its connected links have been deleted successfully!`);
  };

  const recordOGPositions = () => {
    // If no nodes are fixed, fix them all at their current positions first
    const anyFixed = graphData.nodes.some(node => node.fx !== undefined && node.fx !== null);
    
    let nodesToRecord = graphData.nodes;
    if (!anyFixed) {
      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => ({
          ...node,
          fx: node.x,
          fy: node.y,
          fz: node.z
        }))
      }));
      nodesToRecord = graphData.nodes.map(node => ({ ...node, fx: node.x, fy: node.y, fz: node.z }));
    }

    const fixedPositions = nodesToRecord.filter(node => node.fx !== undefined && node.fx !== null).map(node => ({
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
    appendConsoleLine(`Recorded ${fixedPositions.length} fixed node positions and ${recordedLinks.length} links for OG mode!`);
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
      appendConsoleLine(`Style of node ${selectedNodeForEdit.id} copied!`);
    } else {
      appendConsoleLine("No node selected to copy style from.");
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
      appendConsoleLine(`Style applied to node ${selectedNodeForEdit.id}!`);
    } else if (!copiedNodeStyle) {
      appendConsoleLine("No node style copied yet.");
    } else {
      appendConsoleLine("No node selected to apply style to.");
    }
  }, [selectedNodeForEdit, copiedNodeStyle]);

  const handleCopyLinkStyle = useCallback(() => {
    if (selectedLinkForEdit) {
      setCopiedLinkStyle({
        color: selectedLinkForEdit.color,
        thickness: selectedLinkForEdit.thickness,
      });
      appendConsoleLine(`Style of link ${typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} -> ${typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target} copied!`);
    } else {
      appendConsoleLine("No link selected to copy style from.");
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
      appendConsoleLine(`Style applied to link ${typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source} -> ${typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}!`);
    } else if (!copiedLinkStyle) {
      appendConsoleLine("No link style copied yet.");
    } else {
      appendConsoleLine("No link selected to apply style to.");
    }
  }, [selectedLinkForEdit, copiedLinkStyle]);

  const flyToNode = useCallback((node) => {
    if (!node || !graphRef.current) return;
    
    const nodeX = node.x ?? 0;
    const nodeY = node.y ?? 0;
    const nodeZ = node.z ?? 0;
    
    // Zoom closer for standard nodes, slightly further back for timelines
    const distance = node.nodeType === 'timeline' ? 90 : 50;
    const distRatio = 1 + distance / Math.hypot(nodeX, nodeY, nodeZ);
    
    const newPos = nodeX || nodeY || nodeZ
      ? { x: nodeX * distRatio, y: nodeY * distRatio, z: nodeZ * distRatio }
      : { x: 0, y: 0, z: distance };

    graphRef.current.cameraPosition(
      newPos,
      { x: nodeX, y: nodeY, z: nodeZ },
      2500 // Transition duration in ms
    );
    
    appendConsoleLine(`Flying camera to node: ${node.id}`);
  }, [appendConsoleLine]);

  const handleNodeClick = useCallback((node, event) => {
    // Check if Ctrl+Click (or Cmd+Click on Mac) for collapse/expand
    if ((event && (event.ctrlKey || event.metaKey)) || collapseMode) {
      // Toggle collapse state for this node
      const newCollapsed = toggleNodeCollapse(node.id, collapsedNodes);
      setCollapsedNodes(newCollapsed);
      return;
    }
    
    if (isFocusMode) {
      flyToNode(node);
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
  }, [isFocusMode, isLinkSelectionMode, collapseMode, collapsedNodes, flyToNode]);

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


  // Bloom post-processing & Atmosphere Starfield
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const init = () => {
      try {
        // Add Cyberpunk green starfield in the background
        const scene = graph.scene();
        if (scene) {
          const starsGeometry = new THREE.BufferGeometry();
          const starsCount = 400;
          const positions = new Float32Array(starsCount * 3);
          for (let i = 0; i < starsCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 1600;
          }
          starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const starsMaterial = new THREE.PointsMaterial({
            color: '#00ff41',
            size: 1.6,
            transparent: true,
            opacity: 0.35,
            sizeAttenuation: true
          });
          const starField = new THREE.Points(starsGeometry, starsMaterial);
          scene.add(starField);
        }

        const composer = graph.postProcessingComposer();
        if (!composer || bloomRef.current) return;
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js').then(({ UnrealBloomPass }) => {
          import('three/examples/jsm/postprocessing/OutputPass.js').then(({ OutputPass }) => {
            const bloom = new UnrealBloomPass(
              new THREE.Vector2(window.innerWidth, window.innerHeight),
              0.18,  // strength
              0.1,   // radius
              0.6    // threshold — high = only very bright things bloom
            );
            composer.addPass(bloom);
            composer.addPass(new OutputPass());
            bloomRef.current = bloom;
          });
        });
      } catch (e) { /* graph not ready yet */ }
    };
    const t = setTimeout(init, 800);
    return () => clearTimeout(t);
  }, []);

  const handlePaste = useCallback(async (event) => {
    const activeTag = document.activeElement?.tagName;
    const isTypingField = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    
    // Only handle paste if not in a text input field
    if (isTypingField) return;
    
    event.preventDefault();
    
    try {
      const pastedData = await parseClipboardData(event);
      
      // If nothing was pasted, return
      if (!pastedData.images.length && !pastedData.text && !pastedData.urls.length) {
        return;
      }
      
      // Get camera position to place nodes in front of camera
      const graph = graphRef.current;
      if (!graph) return;
      
      const cam = graph.camera();
      const dir = cam.getWorldDirection(new THREE.Vector3());
      const pastePosition = {
        x: cam.position.x + dir.x * 80,
        y: cam.position.y + dir.y * 80,
        z: cam.position.z + dir.z * 80,
      };
      
      // Create nodes from pasted content
      const existingNodeIds = graphData.nodes.map(n => n.id);
      const newNodes = createNodesFromPaste(pastedData, pastePosition, existingNodeIds);
      
      if (newNodes.length === 0) return;
      
      // Add nodes to graph
      setGraphData(prev => ({
        ...prev,
        nodes: [...prev.nodes, ...newNodes],
      }));
      
      // Provide feedback
      const summary = [];
      if (pastedData.images.length) summary.push(`${pastedData.images.length} image(s)`);
      if (pastedData.text) summary.push('text');
      if (pastedData.urls.length) summary.push(`${pastedData.urls.length} link(s)`);
      
      appendConsoleLine(`✓ Pasted: ${summary.join(', ')} (${newNodes.length} node(s) created)`);
    } catch (error) {
      console.error('Error handling paste:', error);
      appendConsoleLine('Error pasting content');
    }
  }, [graphData.nodes, appendConsoleLine]);

  useEffect(() => {
    const handleGlobalKeydown = (event) => {
      const activeTag = document.activeElement?.tagName;
      const isTypingField = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      if (event.key === 'Tab') {
        if (isTypingField) return;
        event.preventDefault();
        setShowConsole((prev) => !prev);
        return;
      }

      if ((event.key === 'n' || event.key === 'N') && !isTypingField) {
        event.preventDefault();
        const graph = graphRef.current;
        if (graph) {
          const cam = graph.camera();
          const dir = cam.getWorldDirection(new THREE.Vector3());
          setInlineNodePos({ x: cam.position.x + dir.x * 80, y: cam.position.y + dir.y * 80, z: cam.position.z + dir.z * 80 });
        }
        setInlineNodeText('');
        setInlineNodeMode(true);
        return;
      }

      if ((event.key === 'l' || event.key === 'L') && !isTypingField) {
        event.preventDefault();
        setIsLinkSelectionMode(true);
        setSelectedNodes([]);
        setSelectedNodeForEdit(null);
        return;
      }

      if (event.key === 'Enter' && isLinkSelectionMode && !isTypingField) {
        event.preventDefault();
        addLink();
        setIsLinkSelectionMode(false);
        return;
      }

      if (event.key === 'Escape') {
        setInlineNodeMode(false);
        setInlineNodeText('');
        setIsLinkSelectionMode(false);
        setSelectedNodes([]);
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const commitInlineNode = useCallback(() => {
    const id = inlineNodeText.trim();
    if (!id) { setInlineNodeMode(false); return; }
    if (graphData.nodes.find(n => n.id === id)) {
      appendConsoleLine(`Node "${id}" already exists.`);
      return;
    }
    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, { id, color: '#00ff41', textSize: 6, group: 'general', ...inlineNodePos, fx: inlineNodePos.x, fy: inlineNodePos.y, fz: inlineNodePos.z }],
    }));
    appendConsoleLine(`Created node "${id}".`);
    setInlineNodeMode(false);
    setInlineNodeText('');
  }, [inlineNodeText, inlineNodePos, graphData.nodes, appendConsoleLine]);

  // Filter graph data based on collapsed nodes
  const baseDisplayData = filterGraphByCollapsedNodes(visibleGraphData, collapsedNodes);
  const displayGraphData = inlineNodeMode && inlineNodeText.trim()
    ? { ...baseDisplayData, nodes: [...baseDisplayData.nodes, { id: inlineNodeText || '…', color: '#00ff41', textSize: 6, isPreview: true, ...inlineNodePos }] }
    : baseDisplayData;

  // Create 3D image cards with dynamic texture loading and neon pink border
  const makeImageNodeObject = (imageUrl) => {
    const group = new THREE.Group();
    const cardWidth = 14;
    const cardHeight = 14;
    const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
    
    const material = new THREE.MeshBasicMaterial({
      color: '#FF6B9D',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    if (imageUrl) {
      if (_textureCache.has(imageUrl)) {
        material.map = _textureCache.get(imageUrl);
        material.color.set('#ffffff');
        material.needsUpdate = true;
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const texture = new THREE.CanvasTexture(img);
          _textureCache.set(imageUrl, texture);
          material.map = texture;
          material.color.set('#ffffff');
          material.needsUpdate = true;
        };
        img.src = imageUrl;
      }
    }
    
    // Glowing neon border frame around the image card
    const borderGeo = new THREE.BufferGeometry();
    const halfW = cardWidth / 2;
    const halfH = cardHeight / 2;
    const vertices = new Float32Array([
      -halfW, -halfH, 0.1,
       halfW, -halfH, 0.1,
       halfW,  halfH, 0.1,
      -halfW,  halfH, 0.1,
      -halfW, -halfH, 0.1
    ]);
    borderGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const borderMat = new THREE.LineBasicMaterial({ color: '#ff007f', linewidth: 2 });
    const border = new THREE.Line(borderGeo, borderMat);
    group.add(border);
    
    return group;
  };

  if (!isDatabaseSelected) {
    return (
      <div className="relative flex min-h-screen w-screen flex-col items-center justify-center bg-black font-sans text-zinc-100 overflow-y-auto px-4 py-8 select-none">
        
        {/* Abstract glowing cyberpunk background circles */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[150px] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-4xl space-y-8">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono">
              MINDMAP 3D
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-mono">
              Interactive Knowledge Visualizer
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left Box: Connect to Existing Database */}
            <Card className="bg-zinc-950/70 border-zinc-800/80 backdrop-blur-md shadow-[0_0_50px_rgba(0,255,65,0.02)] flex flex-col h-[480px]">
              <CardHeader className="border-b border-zinc-900 pb-4">
                <CardTitle className="text-sm font-mono tracking-widest text-[#00ff41] uppercase flex items-center justify-between">
                  <span>Connect to Database</span>
                  <span className="text-[10px] text-zinc-500 font-normal normal-case">
                    {currentUser ? `User: ${currentUser.email}` : 'Guest Session'}
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                {isLoadingCatalog ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#00ff41]/20 border-t-[#00ff41] animate-spin" />
                    <span className="text-xs font-mono text-zinc-500 tracking-wider">Reading catalog...</span>
                  </div>
                ) : catalogError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                    <span className="text-red-500 text-xs font-mono">{catalogError}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          setCatalogError('');
                          setIsLoadingCatalog(true);
                          const list = await fetchGraphCatalog();
                          setDbCatalog(list);
                        } catch (err) {
                          setCatalogError(err.message || 'Failed to reload catalog');
                        } finally {
                          setIsLoadingCatalog(false);
                        }
                      }}
                      className="text-xs font-mono border-zinc-800 hover:bg-zinc-900"
                    >
                      Retry Catalog Fetch
                    </Button>
                  </div>
                ) : dbCatalog.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <span className="text-zinc-500 text-xs font-mono">No database records found in this workspace.</span>
                    <span className="text-[10px] text-zinc-600 font-mono">Initialize a new database on the right or launch Sandbox Mode below.</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {dbCatalog.map(db => (
                      <div 
                        key={db.id} 
                        className="group flex items-center justify-between p-3 rounded-lg border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-800/80 transition-all duration-300"
                      >
                        <div className="space-y-1 truncate pr-3">
                          <p className="font-mono text-sm font-semibold text-zinc-100 truncate group-hover:text-[#00ffff] transition-colors">
                            {db.id}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono">
                            Modified: {new Date(db.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectDatabase(db.id)}
                          className="bg-[#00ffff]/10 border border-[#00ffff]/20 hover:bg-[#00ffff]/20 hover:border-[#00ffff]/40 text-[#00ffff] text-xs font-mono h-8 px-4"
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Box: Create New Database & Sandbox */}
            <Card className="bg-zinc-950/70 border-zinc-800/80 backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.02)] flex flex-col h-[480px]">
              <CardHeader className="border-b border-zinc-900 pb-4">
                <CardTitle className="text-sm font-mono tracking-widest text-[#00ffff] uppercase">
                  Initialize Database
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between p-4">
                {/* Create Database Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 font-mono">New Database Name / ID</Label>
                    <Input
                      placeholder="e.g. project-x-data"
                      value={newDbId}
                      onChange={e => setNewDbId(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateDatabase(); }}
                      className="bg-black/50 border-zinc-800 focus:border-[#00ffff] font-mono text-sm text-[#00ffff]"
                    />
                    <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
                      Accepts alphanumeric characters, hyphens, and underscores. Creates a fresh, empty workspace in your account.
                    </p>
                  </div>

                  <Button
                    onClick={handleCreateDatabase}
                    disabled={!newDbId.trim()}
                    className="w-full bg-[#00ffff] hover:bg-[#06b6d4] text-black font-mono font-bold tracking-wider text-xs h-10 border-none shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    Create & Launch
                  </Button>
                </div>

                <Separator className="border-zinc-900/60 my-6" />

                {/* Sandbox / Bypass Selection */}
                <div className="space-y-4 bg-zinc-900/10 border border-zinc-900/40 rounded-xl p-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-mono text-zinc-300">Sandbox Mode</h4>
                    <p className="text-[10px] text-zinc-500 font-mono leading-normal">
                      Bypass selection and play with dummy data. None of your adjustments will sync to your cloud account.
                    </p>
                  </div>
                  <Button
                    onClick={handleStartSandbox}
                    variant="outline"
                    className="w-full border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-mono text-xs h-10"
                  >
                    Launch Sandbox Workspace
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-black text-white">

      {/* Inline link mode — minimal bottom bar */}
      {isLinkSelectionMode && !inlineNodeMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 pointer-events-none">
          <span style={{ color: '#00ff4155', fontFamily: 'Courier New, monospace', fontSize: 13, letterSpacing: '0.12em' }}>L›</span>
          <span style={{ fontFamily: 'Courier New, monospace', fontSize: 15, color: '#00ffff', textShadow: '0 0 6px #00ffff' }}>
            {selectedNodes[0]
              ? <><span style={{ color: '#FFD700' }}>{selectedNodes[0]}</span><span style={{ color: '#00ff4155' }}> → </span>{selectedNodes[1] ? <span style={{ color: '#FFD700' }}>{selectedNodes[1]}</span> : <span style={{ opacity: 0.4 }}>click 2nd node…</span>}</>
              : <span style={{ opacity: 0.4 }}>click a node…</span>}
          </span>
          {selectedNodes[0] && selectedNodes[1] && (
            <span
              className="pointer-events-auto"
              onClick={() => { addLink(); setIsLinkSelectionMode(false); }}
              style={{ color: '#00ff41', fontFamily: 'Courier New, monospace', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #00ff4155', textShadow: '0 0 6px #00ff41' }}
            >ENTER to link</span>
          )}
          <span style={{ color: '#00ff4133', fontFamily: 'Courier New, monospace', fontSize: 10, letterSpacing: '0.1em' }}>ESC cancel</span>
        </div>
      )}

      {/* Inline node creation — minimal bottom bar, graph stays fully interactive */}
      {inlineNodeMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 pointer-events-none">
          <span style={{ color: '#00ff4155', fontFamily: 'Courier New, monospace', fontSize: 13, letterSpacing: '0.12em' }}>N›</span>
          <input
            autoFocus
            value={inlineNodeText}
            onChange={e => setInlineNodeText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitInlineNode();
              if (e.key === 'Escape') { setInlineNodeMode(false); setInlineNodeText(''); }
            }}
            placeholder="type node name…"
            className="pointer-events-auto"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${inlineNodeText && graphData.nodes.find(n => n.id === inlineNodeText.trim()) ? '#ff00cc' : '#00ff41'}`,
              color: '#00ff41',
              fontFamily: 'Courier New, monospace',
              fontSize: 18,
              padding: '2px 0',
              outline: 'none',
              width: 280,
              textShadow: '0 0 8px #00ff41',
              caretColor: '#00ff41',
            }}
          />
          <span style={{ color: '#00ff4133', fontFamily: 'Courier New, monospace', fontSize: 10, letterSpacing: '0.1em' }}>ESC cancel</span>
        </div>
      )}

      <ForceGraph3D
        ref={graphRef}
        graphData={displayGraphData}
        nodeLabel="id"
        nodeAutoColorBy="group"
        nodeThreeObject={node => {
          const group = new THREE.Group();

          // 1. Generate 3D physical geometry mesh
          let geom, mat;
          if (node.nodeType === 'timeline') {
            geom = new THREE.OctahedronGeometry(4);
            mat = new THREE.MeshStandardMaterial({
              color: '#FFD700',
              emissive: '#FFD700',
              emissiveIntensity: 0.8,
              metalness: 0.9,
              roughness: 0.1,
            });
          } else if (node.nodeType === 'image' && node.imageUrl) {
            return makeImageNodeObject(node.imageUrl);
          } else if (node.nodeType === 'text') {
            geom = new THREE.TorusGeometry(3.5, 0.9, 8, 16);
            mat = new THREE.MeshStandardMaterial({
              color: node.color || '#00ffff',
              emissive: node.color || '#00ffff',
              emissiveIntensity: 0.7,
              metalness: 0.8,
              roughness: 0.2,
            });
          } else if (node.nodeType === 'link') {
            geom = new THREE.CylinderGeometry(2, 2, 6, 8);
            mat = new THREE.MeshStandardMaterial({
              color: '#0088ff',
              emissive: '#0088ff',
              emissiveIntensity: 0.7,
              metalness: 0.8,
              roughness: 0.2,
            });
          } else {
            // Default standard node
            geom = new THREE.SphereGeometry(3.2, 16, 16);
            mat = new THREE.MeshStandardMaterial({
              color: node.color || '#00ff41',
              emissive: node.color || '#00ff41',
              emissiveIntensity: 0.6,
              metalness: 0.8,
              roughness: 0.2,
            });
          }

          const mesh = new THREE.Mesh(geom, mat);
          
          // Self-rotation in render loop using native onBeforeRender callback
          mesh.onBeforeRender = () => {
            mesh.rotation.y += 0.015;
            mesh.rotation.x += 0.007;
          };
          group.add(mesh);

          // 2. Generate and attach the elegant floating UI label tag
          let tag;
          if (node.nodeType === 'timeline') {
            tag = makeCyberpunkSprite(node.id, '#FFD700', 8, true);
          } else if (node.nodeType === 'link' && node.url) {
            const urlPreview = node.url.replace(/https?:\/\/(www\.)?/, '').substring(0, 18) + (node.url.length > 18 ? '…' : '');
            tag = makeCyberpunkSprite(urlPreview, '#0088ff', 5);
          } else if (node.nodeType === 'text' && node.textContent) {
            const preview = node.textContent.substring(0, 20) + (node.textContent.length > 20 ? '…' : '');
            tag = makeCyberpunkSprite(preview, node.color || '#00ffff', 6);
          } else {
            tag = makeCyberpunkSprite(node.id, node.color || '#00ff41', 5);
          }

          tag.position.y = node.nodeType === 'timeline' ? 9 : 8;
          group.add(tag);

          return group;
        }}
        linkCurvature={0.2}
        linkWidth={link => {
          const lt = LINK_TYPES[link.linkType] || LINK_TYPES.wire;
          return link.thickness ?? lt.width;
        }}
        linkOpacity={0.65}
        linkColor={link => {
          const lt = LINK_TYPES[link.linkType] || LINK_TYPES.wire;
          return link.color || lt.color;
        }}
        linkDirectionalParticles={link => (LINK_TYPES[link.linkType] || LINK_TYPES.wire).particles}
        linkDirectionalParticleSpeed={link => (LINK_TYPES[link.linkType] || LINK_TYPES.wire).particleSpeed}
        linkDirectionalParticleWidth={link => (LINK_TYPES[link.linkType] || LINK_TYPES.wire).particleWidth}
        linkDirectionalParticleColor={link => (LINK_TYPES[link.linkType] || LINK_TYPES.wire).particleColor}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeDragEnd={onNodeDragEnd}
        backgroundColor="#000000"
      />

      {showNavigator && (
        <FloatablePanel
          id="navigator-panel"
          title="Quick Navigation & Bookmarks"
          defaultPosition={{ x: getPanelX("navigator"), y: 80 }}
          defaultSize={{ width: 280, height: 420 }}
          minWidth={250}
          minHeight={300}
          onClose={() => setShowNavigator(false)}
        >
          <div className="space-y-4 text-xs font-mono text-zinc-100 custom-scrollbar overflow-y-auto max-h-[80vh]">
            {/* 1. Node Finder Search */}
            <div className="space-y-2">
              <Label className="text-[10px] text-[#00ff41] uppercase tracking-wider">Find Node</Label>
              <Input
                placeholder="Search node ID..."
                value={navigatorSearch}
                onChange={e => setNavigatorSearch(e.target.value)}
                className="bg-black/40 border-zinc-700 text-[#00ff41] font-mono focus:border-[#00ff41]"
              />
              <div className="border border-zinc-800/80 bg-black/20 rounded divide-y divide-zinc-800 max-h-40 overflow-y-auto custom-scrollbar">
                {graphData.nodes
                  .filter(node => !node.isPreview && (!navigatorSearch || node.id.toLowerCase().includes(navigatorSearch.toLowerCase())))
                  .map(node => (
                    <div key={node.id} className="flex items-center justify-between p-2 hover:bg-zinc-800/40">
                      <div className="truncate pr-2">
                        <span className="text-zinc-100 font-bold block truncate">{node.id}</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{node.nodeType || 'standard'}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => flyToNode(node)}
                        className="text-[#00ff41] border-[#00ff4133] hover:bg-[#00ff411a] px-2 py-0.5 h-auto text-[10px]"
                      >
                        Fly
                      </Button>
                    </div>
                  ))}
                {graphData.nodes.filter(node => !node.isPreview && (!navigatorSearch || node.id.toLowerCase().includes(navigatorSearch.toLowerCase()))).length === 0 && (
                  <div className="p-2 text-zinc-500 text-center">No nodes found</div>
                )}
              </div>
            </div>

            <Separator className="border-zinc-800" />

            {/* 2. Camera Viewport Bookmarks */}
            <div className="space-y-2">
              <Label className="text-[10px] text-[#00ffff] uppercase tracking-wider">Viewport Bookmarks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="View name..."
                  value={newBookmarkName}
                  onChange={e => setNewBookmarkName(e.target.value)}
                  className="bg-black/40 border-zinc-700 text-[#00ffff] font-mono focus:border-[#00ffff] h-7 text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const name = newBookmarkName.trim();
                    if (!name) return;
                    const cam = graphRef.current.camera();
                    const lookAt = graphRef.current.controls().target;
                    const bookmark = {
                      name,
                      position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
                      lookAt: { x: lookAt.x, y: lookAt.y, z: lookAt.z },
                      up: { x: cam.up.x, y: cam.up.y, z: cam.up.z },
                      zoom: cam.zoom,
                      isOrthographic: cam.isOrthographicCamera,
                    };
                    setCameraBookmarks(others => [...others.filter(b => b.name !== name), bookmark]);
                    setNewBookmarkName('');
                    appendConsoleLine(`Captured view bookmark: ${name}`);
                  }}
                  className="text-[#00ffff] border-[#00ffff33] hover:bg-[#00ffff1a] h-7 px-3 text-[10px]"
                  variant="outline"
                >
                  Capture
                </Button>
              </div>

              <div className="border border-zinc-800/80 bg-black/20 rounded divide-y divide-zinc-800 max-h-36 overflow-y-auto custom-scrollbar">
                {cameraBookmarks.map(bookmark => (
                  <div key={bookmark.name} className="flex items-center justify-between p-2 hover:bg-zinc-800/40">
                    <span className="truncate text-zinc-100 font-bold pr-2">{bookmark.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCameraView(bookmark.position, bookmark.lookAt, bookmark.up, bookmark.zoom, bookmark.isOrthographic);
                          appendConsoleLine(`Loaded view bookmark: ${bookmark.name}`);
                        }}
                        className="text-[#00ffff] border-[#00ffff33] hover:bg-[#00ffff1a] px-2 py-0.5 h-auto text-[10px]"
                      >
                        Go
                      </Button>
                      <button
                        onClick={() => {
                          setCameraBookmarks(others => others.filter(b => b.name !== bookmark.name));
                          appendConsoleLine(`Deleted view bookmark: ${bookmark.name}`);
                        }}
                        className="text-red-500 hover:text-red-300 px-1 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {cameraBookmarks.length === 0 && (
                  <div className="p-2 text-zinc-500 text-center">No bookmarks saved</div>
                )}
              </div>
            </div>
          </div>
        </FloatablePanel>
      )}

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
                        appendConsoleLine('Please select a node to delete');
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
                        <div className="space-y-2">
                          <Label>Link Type</Label>
                          <Select value={newLinkType} onValueChange={setNewLinkType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(LINK_TYPES).map(([key, val]) => (
                                <SelectItem key={key} value={key}>{val.label}</SelectItem>
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
                                appendConsoleLine("Please select both source and target nodes");
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
          title={`Node Inspector: ${selectedNodeForEdit.id}`}
          defaultPosition={{ x: getPanelX("node-editor"), y: 80 }}
          defaultSize={{ width: 300, height: 'auto' }}
          onClose={() => {
            setSelectedNodeForEdit(null);
            setSelectedLinkForEdit(null);
          }}
        >
          <div className="space-y-5 font-sans text-zinc-200">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button onClick={handleNextNode} size="xs" variant="outline" className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[10px] tracking-wider uppercase py-1 h-7">
                Next Node
              </Button>
              <Button onClick={handleCopyNodeStyle} size="xs" variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[10px] tracking-wider uppercase py-1 h-7">
                Copy
              </Button>
              <Button onClick={handleApplyNodeStyle} size="xs" variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[10px] tracking-wider uppercase py-1 h-7" disabled={!copiedNodeStyle}>
                Apply
              </Button>
            </div>

            {/* Appearance Section */}
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block border-b border-zinc-905/30 pb-1">Appearance</span>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">Color Palette</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map(c => {
                    const isSelected = (selectedNodeForEdit.color || '#1A75FF').toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.value}
                        onClick={() => {
                          const newColor = c.value;
                          setGraphData(prev => ({...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, color: newColor } : n)}));
                          setSelectedNodeForEdit(prev => ({ ...prev, color: newColor }));
                        }}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border border-zinc-800/60'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-black rounded-full" />}
                      </button>
                    );
                  })}
                  {/* Custom color input wrapper */}
                  <div className="relative w-6 h-6 rounded-full border border-zinc-800 cursor-pointer overflow-hidden transition-transform hover:scale-110" style={{ background: 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)' }} title="Custom Color">
                    <input 
                      type="color" 
                      value={selectedNodeForEdit.color || '#1A75FF'} 
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setGraphData(prev => ({...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, color: newColor } : n)}));
                        setSelectedNodeForEdit(prev => ({ ...prev, color: newColor }));
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400 flex justify-between">
                  <span>Text Size</span>
                  <span className="text-zinc-500 font-mono">{selectedNodeForEdit.textSize || 6}px</span>
                </Label>
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

            {/* Data Fields Section */}
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block border-b border-zinc-905/30 pb-1">Data Fields</span>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Amount / Cost</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={selectedNodeForEdit.amount || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      setGraphData(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, amount: val } : n) }));
                      setSelectedNodeForEdit(prev => ({ ...prev, amount: val }));
                    }}
                    className="bg-black/40 border-zinc-800 focus:border-zinc-700 h-8 text-xs font-mono text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Date</Label>
                  <Input
                    type="date"
                    value={selectedNodeForEdit.date || ''}
                    onChange={(e) => {
                      const val = e.target.value || undefined;
                      setGraphData(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === selectedNodeForEdit.id ? { ...n, date: val } : n) }));
                      setSelectedNodeForEdit(prev => ({ ...prev, date: val }));
                    }}
                    className="bg-black/40 border-zinc-800 focus:border-zinc-700 h-8 text-xs font-mono text-zinc-200"
                  />
                </div>
              </div>
            </div>

            {/* Relationships / Connecting Nodes */}
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block border-b border-zinc-905/30 pb-1">Relationships</span>
              
              <div className="space-y-2">
                <Input
                  placeholder="New node name..."
                  value={connectedNodeId}
                  onChange={(e) => setConnectedNodeId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addConnectedNode(); }}
                  className="bg-black/40 border-zinc-800 focus:border-zinc-700 h-8 text-xs text-zinc-200"
                />
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={connectedLinkType} onValueChange={setConnectedLinkType}>
                      <SelectTrigger className="bg-black/40 border-zinc-800 focus:border-zinc-700 h-8 text-xs text-zinc-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                        {Object.entries(LINK_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key} className="text-xs">{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={addConnectedNode} 
                    disabled={!connectedNodeId.trim()}
                    className="bg-[#00ffff] hover:bg-[#06b6d4] text-black font-semibold text-xs px-3 h-8"
                  >
                    + Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FloatablePanel>
      )}

      {/* Link Property Editor Panel */}
      {selectedLinkForEdit && !selectedNodeForEdit && (
        <FloatablePanel
          id="link-editor-panel"
          title="Link Inspector"
          defaultPosition={{ x: getPanelX("link-editor"), y: 80 }}
          defaultSize={{ width: 300, height: 'auto' }}
          onClose={() => setSelectedLinkForEdit(null)}
        >
          <div className="space-y-5 font-sans text-zinc-200">
            {/* Header path detail */}
            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/40 p-2 rounded border border-zinc-900/65 flex items-center justify-center gap-2">
              <span className="text-zinc-100 font-bold truncate max-w-[100px]">{typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source}</span>
              <span className="text-[#00ffff]">→</span>
              <span className="text-zinc-100 font-bold truncate max-w-[100px]">{typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target}</span>
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">Link Connection Type</Label>
                <Select
                  value={selectedLinkForEdit.linkType || 'wire'}
                  onValueChange={(val) => {
                    const lt = LINK_TYPES[val] || LINK_TYPES.wire;
                    const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                    const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                    setGraphData(prev => ({...prev, links: prev.links.map(l => {
                      const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                      const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                      return (lSourceId === sSourceId && lTargetId === sTargetId) ? { ...l, linkType: val, color: lt.color, thickness: lt.width } : l;
                    })}));
                    setSelectedLinkForEdit(prev => ({ ...prev, linkType: val, color: lt.color, thickness: lt.width }));
                  }}
                >
                  <SelectTrigger className="bg-black/40 border-zinc-800 focus:border-zinc-700 h-8 text-xs text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                    {Object.entries(LINK_TYPES).map(([key, v]) => (
                      <SelectItem key={key} value={key} className="text-xs">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">Color Palette</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map(c => {
                    const isSelected = (selectedLinkForEdit.color || '#F0F0F0').toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.value}
                        onClick={() => {
                          const newColor = c.value;
                          const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                          const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                          setGraphData(prev => ({...prev, links: prev.links.map(l => {
                            const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                            const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                            return (lSourceId === sSourceId && lTargetId === sTargetId) ? { ...l, color: newColor } : l;
                          })}));
                          setSelectedLinkForEdit(prev => ({ ...prev, color: newColor }));
                        }}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border border-zinc-800/60'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-black rounded-full" />}
                      </button>
                    );
                  })}
                  {/* Custom color input wrapper */}
                  <div className="relative w-6 h-6 rounded-full border border-zinc-800 cursor-pointer overflow-hidden transition-transform hover:scale-110" style={{ background: 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)' }} title="Custom Color">
                    <input 
                      type="color" 
                      value={selectedLinkForEdit.color || '#F0F0F0'} 
                      onChange={(e) => {
                        const newColor = e.target.value;
                        const sSourceId = typeof selectedLinkForEdit.source === 'object' ? selectedLinkForEdit.source.id : selectedLinkForEdit.source;
                        const sTargetId = typeof selectedLinkForEdit.target === 'object' ? selectedLinkForEdit.target.id : selectedLinkForEdit.target;
                        setGraphData(prev => ({...prev, links: prev.links.map(l => {
                          const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
                          const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
                          return (lSourceId === sSourceId && lTargetId === sTargetId) ? { ...l, color: newColor } : l;
                        })}));
                        setSelectedLinkForEdit(prev => ({ ...prev, color: newColor }));
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400 flex justify-between">
                  <span>Thickness</span>
                  <span className="text-zinc-500 font-mono">{selectedLinkForEdit.thickness || 1}px</span>
                </Label>
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
          </div>
        </FloatablePanel>
      )}

      {/* Cyberpunk Dashboard */}
      {showDashboard && (
        <CyberpunkDashboard
          graphData={graphData}
          defaultPosition={{ x: Math.max(20, window.innerWidth / 2 - 360), y: 80 }}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {/* Timeline Generator Panel */}
      {showTimeline && (
        <FloatablePanel
          id="timeline-panel"
          title="Timeline Generator"
          defaultPosition={{ x: getPanelX('timeline'), y: 80 }}
          defaultSize={{ width: 280, height: 'auto' }}
          minWidth={250}
          onClose={() => setShowTimeline(false)}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Granularity</Label>
              <Select value={timelineGranularity} onValueChange={setTimelineGranularity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input
                type="number"
                value={timelineYear}
                onChange={e => setTimelineYear(parseInt(e.target.value) || new Date().getFullYear())}
              />
            </div>
            <div className="space-y-1">
              <Label>Range</Label>
              <Select value={timelineRange} onValueChange={setTimelineRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Year</SelectItem>
                  <SelectItem value="Q1">Q1 (Jan–Mar)</SelectItem>
                  <SelectItem value="Q2">Q2 (Apr–Jun)</SelectItem>
                  <SelectItem value="Q3">Q3 (Jul–Sep)</SelectItem>
                  <SelectItem value="Q4">Q4 (Oct–Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Y Position (height in scene)</Label>
              <Input
                type="number"
                value={timelineSpacingY}
                onChange={e => setTimelineSpacingY(parseInt(e.target.value) || 200)}
              />
            </div>
            <Button onClick={generateTimeline} size="sm" className="w-full">
              Generate Timeline
            </Button>
            <p className="text-xs opacity-60">
              Gold nodes = time anchors. Click any time node → "Add Connected Node" to attach a task to it.
            </p>
          </div>
        </FloatablePanel>
      )}

      <div
        className={`absolute top-0 left-4 z-[70] w-[900px] max-w-[calc(100vw-2rem)] border border-zinc-500/80 bg-zinc-900/30 text-zinc-100 shadow-2xl backdrop-blur-sm transition-all duration-300 ${showConsole ? 'translate-y-4 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-600/80 px-3 py-2">
          <p className="text-sm font-semibold tracking-wide">Console</p>
          <button className="text-zinc-300 hover:text-zinc-100" onClick={() => setShowConsole(false)}>×</button>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-300">
          <span>Active graph: <span className="text-zinc-100">{graphId}</span></span>
          <span className="text-zinc-400">Press <kbd className="rounded border border-zinc-500 px-1">Tab</kbd> to toggle</span>
        </div>
        <div ref={consoleOutputRef} className="h-96 overflow-y-auto border-y border-zinc-600/80 bg-black/30 px-3 py-2 font-mono text-4xl leading-tight custom-scrollbar">
          {consoleLines.map((line, idx) => (
            <div key={`${line}-${idx}`} className="whitespace-pre-wrap break-all" style={{ color: '#00ff41', textShadow: '0 0 8px #00ff41, 0 0 16px #00ff41' }}>{line}</div>
          ))}
        </div>
        <div className="flex gap-2 px-3 py-3">
          <input
            className="flex-1 border border-zinc-600 bg-black/30 px-2 py-1 font-mono text-4xl outline-none focus:border-green-400"
            style={{ color: '#00ff41', textShadow: '0 0 6px #00ff41' }}
            placeholder="Type command..."
            value={consoleInput}
            onChange={(e) => setConsoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submitConsoleCommand();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                handleTabCompletion();
              }
            }}
          />
          <button className="border border-zinc-600 bg-zinc-800/60 px-3 text-xs hover:bg-zinc-700/70" onClick={submitConsoleCommand}>Run</button>
        </div>
      </div>

      {/* Master Toggle Menu (Toolbar Dock) */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex max-w-[95vw] flex-col items-center gap-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/80 p-2 px-3 shadow-2xl backdrop-blur-xl">
          
          {/* Workspace Views */}
          <button 
            onClick={() => setShowConsole(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showConsole ? 'bg-emerald-500/15 text-[#00ff41] border border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,65,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Console
          </button>
          <button 
            onClick={() => setShowFileOps(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showFileOps ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Files
          </button>
          <button 
            onClick={() => setShowNavigator(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showNavigator ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Navigator
          </button>
          
          {/* Divider */}
          <div className="w-px h-4 bg-zinc-800/80 mx-1" />
          
          {/* Node Actions */}
          <button 
            onClick={() => setShowAddNode(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showAddNode ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            + Node
          </button>
          <button 
            onClick={() => setShowDeleteNode(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showDeleteNode ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            - Node
          </button>
          <button 
            onClick={() => setShowAddLink(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showAddLink ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Link
          </button>
          <button 
            onClick={() => setShowTimeline(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showTimeline ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Timeline
          </button>
          
          {/* Divider */}
          <div className="w-px h-4 bg-zinc-800/80 mx-1" />
          
          {/* Dashboard View */}
          <button 
            onClick={() => setShowDashboard(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 ${showDashboard ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.05)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'}`}
          >
            Dashboard
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-zinc-800/80 mx-1" />

          {/* Save & Exit Control Group */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => saveGraphToCloud()}
              disabled={isSavingCloud}
              className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 border border-emerald-500/35 bg-emerald-500/10 text-[#00ff41] hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSavingCloud ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={handleExitDatabase}
              className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all duration-300 border border-red-500/35 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95"
            >
              Exit
            </button>
          </div>

        </div>
        {groupNames.length > 0 && (
          <div className="flex max-w-[95vw] flex-wrap items-center justify-center gap-2 rounded-full border border-zinc-800/80 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-500">Groups:</span>
            {groupNames.map((groupName) => {
              const isVisible = !hiddenGroups.has(groupName);
              return (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => toggleGroupVisibility(groupName)}
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-wide transition border ${isVisible ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500 line-through'}`}
                >
                  {groupName}
                </button>
              );
            })}
            <button
              type="button"
              onClick={showAllGroups}
              className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-wide text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              Show all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

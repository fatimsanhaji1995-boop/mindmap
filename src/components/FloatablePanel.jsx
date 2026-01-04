import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import './FloatablePanel.css';

export const FloatablePanel = ({
  id = 'panel',
  title = 'Panel',
  children,
  onClose,
  defaultPosition = { x: 20, y: 20 },
  defaultSize = { width: 300, height: 'auto' },
  minWidth = 250,
  minHeight = 100,
  isDraggable = true,
  isResizable = true,
  className = '',
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const panelRef = useRef(null);

  // Update position when defaultPosition changes (important for dynamic alignment)
  useEffect(() => {
    setPosition(defaultPosition);
  }, [defaultPosition.x, defaultPosition.y]);

  // Handle drag start (Mouse & Touch)
  const handleDragStart = (e) => {
    if (!isDraggable) return;
    if (e.target.closest('[data-no-drag]')) return;

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    
    // Prevent scrolling on touch
    if (e.type === 'touchstart') {
      // e.preventDefault(); // Can cause issues with buttons inside
    }
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      setPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y,
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  // Handle resize start
  const handleResizeStart = (e) => {
    if (!isResizable) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    setIsResizing(true);
    const rect = panelRef.current.getBoundingClientRect();
    setResizeStart({
      x: clientX,
      y: clientY,
      width: rect.width,
      height: rect.height,
    });
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e) => {
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - resizeStart.x;
      const deltaY = clientY - resizeStart.y;

      setSize({
        width: Math.max(minWidth, resizeStart.width + deltaX),
        height: Math.max(minHeight, resizeStart.height + deltaY),
      });
    };

    const handleEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, resizeStart, minWidth, minHeight]);

  return (
    <motion.div
      ref={panelRef}
      className={`floatable-panel ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${className}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        
        zIndex: isDragging || isResizing ? 9999 : 100,
        touchAction: 'none', // Critical for touch dragging
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <div className="floatable-panel-container">
        <div
          className="floatable-panel-header"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ cursor: isDraggable ? 'grab' : 'default' }}
        >
          <div className="floatable-panel-header-content">
            {isDraggable && (
              <GripVertical className="floatable-panel-grip-icon" size={14} />
            )}
            <h3 className="floatable-panel-title">{title}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="floatable-panel-close-btn"
              data-no-drag
            >
              Hide
            </button>
          )}
        </div>

        <div className="floatable-panel-content overflow-y-auto max-h-[80vh]">
          {children}
        </div>

        {isResizable && (
          <div
            className="floatable-panel-resize-handle"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          />
        )}
      </div>
    </motion.div>
  );
};

export default FloatablePanel;

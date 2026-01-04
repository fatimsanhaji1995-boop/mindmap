import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import './FloatablePanel.css';

/**
 * FloatablePanel Component
 * A draggable and resizable panel that floats above other content
 * 
 * Props:
 * - id: unique identifier for the panel
 * - title: title displayed in the header
 * - children: content to display inside the panel
 * - onClose: callback when close button is clicked
 * - defaultPosition: { x, y } initial position
 * - defaultSize: { width, height } initial size
 * - minWidth: minimum width in pixels
 * - minHeight: minimum height in pixels
 * - isDraggable: whether the panel can be dragged (default: true)
 * - isResizable: whether the panel can be resized (default: true)
 */
export const FloatablePanel = ({
  id = 'panel',
  title = 'Panel',
  children,
  onClose,
  defaultPosition = { x: 20, y: 20 },
  defaultSize = { width: 400, height: 500 },
  minWidth = 300,
  minHeight = 200,
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
  const headerRef = useRef(null);

  // Handle drag start
  const handleDragStart = (e) => {
    if (!isDraggable) return;
    if (e.target.closest('[data-no-drag]')) return;

    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle resize start
  const handleResizeStart = (e) => {
    if (!isResizable) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      setSize({
        width: Math.max(minWidth, resizeStart.width + deltaX),
        height: Math.max(minHeight, resizeStart.height + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Panel Container */}
      <div className="floatable-panel-container">
        {/* Header */}
        <div
          ref={headerRef}
          className="floatable-panel-header"
          onMouseDown={handleDragStart}
          data-no-drag={!isDraggable}
        >
          <div className="floatable-panel-header-content">
            {isDraggable && (
              <GripVertical className="floatable-panel-grip-icon" size={16} />
            )}
            <h3 className="floatable-panel-title">{title}</h3>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="floatable-panel-close-btn"
              data-no-drag
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="floatable-panel-content">
          {children}
        </div>

        {/* Resize Handle */}
        {isResizable && (
          <div
            className="floatable-panel-resize-handle"
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </motion.div>
  );
};

export default FloatablePanel;

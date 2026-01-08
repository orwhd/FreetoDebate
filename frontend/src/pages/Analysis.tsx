import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Activity, Users, Share2, BarChart3, Network } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Treemap } from 'recharts';

interface GraphNode {
  id: string;
  group?: number;
  val?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface Community {
  members: string[];
  central_members: string[];
  relations: { source: string; target: string; type: string }[];
  summary: string;
}

interface CommunitiesData {
  [key: string]: Community;
}

const PLATFORMS = [
  { id: 'bilibili', name: 'Bilibili', color: '#FF69B4' },
  { id: 'zhihu', name: 'Zhihu', color: '#0084FF' },
  { id: 'weibo', name: 'Weibo', color: '#FFD700' },
];

export const Analysis: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('bilibili');
  const [viewMode, setViewMode] = useState<'graph' | 'charts'>('graph');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [communities, setCommunities] = useState<CommunitiesData>({});
  const [loading, setLoading] = useState(false);
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>());
  const [highlightLinks, setHighlightLinks] = useState(new Set<any>());
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    fetchData(selectedPlatform);
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, [selectedPlatform]);

  const fetchData = async (platform: string) => {
    setLoading(true);
    setGraphData({ nodes: [], links: [] }); // Reset data to force re-render/refresh
    try {
      const response = await fetch(`http://localhost:8000/api/data/${platform}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      console.log('Fetched data:', data);
      
      // Ensure graph data has nodes and links
      const gData = data.graph || { nodes: [], links: [] };
      if (!gData.nodes) gData.nodes = [];
      if (!gData.links) gData.links = [];
      
      setGraphData(gData);
      setCommunities(data.communities || {});
    } catch (error) {
      console.error(error);
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: any) => {
    console.log('Clicked node:', node);
    if (node && node.id) {
      setSelectedNode(node.id);
      
      const newHighlightNodes = new Set<string>();
      const newHighlightLinks = new Set<any>();
      
      newHighlightNodes.add(node.id);
      
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          newHighlightLinks.add(link);
          newHighlightNodes.add(sourceId);
          newHighlightNodes.add(targetId);
        }
      });
      
      setHighlightNodes(newHighlightNodes);
      setHighlightLinks(newHighlightLinks);

      fgRef.current?.centerAt(node.x, node.y, 1000);
      fgRef.current?.zoom(2, 1000);
    }
  };

  const handleResetFilter = () => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    fgRef.current?.zoomToFit(1000);
  };

  const HighlightedText = ({ text, highlight }: { text: string, highlight: string | null }) => {
    if (!highlight) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-app-primary/20 text-app-primary font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const filteredCommunities = React.useMemo(() => {
    if (!selectedNode) return Object.entries(communities);
    
    console.log(`Filtering communities for node: "${selectedNode}"`);
    
    return Object.entries(communities).filter(([id, comm]) => {
      const inMembers = comm.members?.includes(selectedNode);
      const inCentral = comm.central_members?.includes(selectedNode);
      const inSummary = comm.summary?.includes(selectedNode);
      
      // Fallback to members check to ensure we find results for all graph nodes
      return inSummary || inMembers || inCentral;
    });
  }, [communities, selectedNode]);

  const getGraphDataWithWeights = React.useMemo(() => {
    if (!graphData.nodes.length) return graphData;

    // Calculate node weights based on number of connections
    const nodeDegrees: Record<string, number> = {};
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      nodeDegrees[sourceId] = (nodeDegrees[sourceId] || 0) + 1;
      nodeDegrees[targetId] = (nodeDegrees[targetId] || 0) + 1;
    });

    // Normalize weights between 4 and 12 for visualization
    const degrees = Object.values(nodeDegrees);
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    
    return {
      ...graphData,
      nodes: graphData.nodes.map(node => {
        const degree = nodeDegrees[node.id] || 0;
        // Linear interpolation: min -> 3, max -> 30 (Significantly increased range for extreme size difference)
        const size = maxDegree === minDegree 
          ? 3 
          : 3 + ((degree - minDegree) / (maxDegree - minDegree)) * 27;
        return { ...node, val: size }; // 'val' property controls node size in ForceGraph2D
      })
    };
  }, [graphData]);

  // Data preparation for charts
  const chartsData = React.useMemo(() => {
    if (!graphData.nodes.length) return { topNodes: [], communitySizes: [] };

    // 1. Top Entities (Bar Chart)
    const nodeDegrees: Record<string, number> = {};
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      nodeDegrees[sourceId] = (nodeDegrees[sourceId] || 0) + 1;
      nodeDegrees[targetId] = (nodeDegrees[targetId] || 0) + 1;
    });

    const topNodes = Object.entries(nodeDegrees)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // 2. Community Sizes (Treemap)
    // Map communities to a format Recharts Treemap understands
    const communitySizes = Object.entries(communities).map(([id, comm]) => ({
      name: comm.central_members[0] || `Cluster ${id}`, // Use the first central member as label
      size: comm.members.length,
      fullData: comm
    })).sort((a, b) => b.size - a.size).slice(0, 15); // Top 15 largest communities

    return { topNodes, communitySizes };
  }, [graphData, communities]);

  // Custom Content for Treemap
  const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, name } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: depth < 2 ? (PLATFORMS.find(p => p.id === selectedPlatform)?.color || '#00F0FF') : 'none',
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
            opacity: 0.1 + (index % 10) * 0.05 + 0.3 // vary opacity slightly
          }}
        />
        {width > 30 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 7}
            textAnchor="middle"
            fill="#fff"
            stroke="none"
            fontSize={Math.min(width / 5, 14)}
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Activity className="text-app-primary" />
          Public Opinion Analysis
        </h2>
        
        <div className="flex gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`px-4 py-2 rounded-sm font-mono text-sm transition-all border ${
                selectedPlatform === p.id 
                  ? 'bg-app-primary text-black font-bold border-app-primary'
                  : 'bg-app-panel border-app-border text-gray-400 hover:text-white hover:border-app-primary'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden">
        {/* Left Panel: Communities */}
        <div className="lg:col-span-1 bg-app-panel border border-app-border rounded-sm p-4 overflow-y-auto flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="font-display text-lg flex items-center gap-2 text-app-secondary">
              <Users size={20} />
              {selectedNode ? 'Relevant Clusters' : 'Community Clusters'}
            </h3>
            {selectedNode && (
              <button 
                onClick={handleResetFilter}
                className="text-xs text-app-primary hover:text-white border border-app-primary px-2 py-1 rounded hover:bg-app-primary/20 transition-colors"
              >
                Clear: #{selectedNode}
              </button>
            )}
          </div>
          
          <div className="space-y-4 overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center text-gray-500 py-10 animate-pulse">Scanning neural networks...</div>
            ) : filteredCommunities.length > 0 ? (
              filteredCommunities.map(([id, comm]) => (
                <div key={id} className="bg-app-bg/50 border border-app-border/50 p-4 rounded-sm hover:border-app-primary/50 transition-colors">
                  <p className="text-sm text-gray-300 leading-relaxed mb-3 font-light">
                    <HighlightedText text={comm.summary} highlight={selectedNode} />
                  </p>
                  
                  {/* If the keyword is not in the summary, explicitly show it to satisfy "must contain characters" requirement */}
                  {selectedNode && !comm.summary?.includes(selectedNode) && (
                    <div className="mb-3">
                       <span className="text-xs font-mono bg-app-primary/20 text-app-primary px-2 py-0.5 rounded border border-app-primary/30">
                         Related: #{selectedNode}
                       </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono border-t border-app-border/30 pt-2">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {comm.members.length} entities
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 size={12} /> {comm.relations.length} relations
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-10 font-mono text-sm">
                No communities found containing "{selectedNode}"
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Graph or Charts */}
        <div className="lg:col-span-2 bg-app-panel border border-app-border rounded-sm overflow-hidden relative h-full flex flex-col" ref={containerRef}>
          {/* Header/Toggle for Right Panel */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="bg-app-bg/80 backdrop-blur px-3 py-1 rounded border border-app-border text-xs font-mono text-gray-400 pointer-events-none">
              {graphData?.nodes?.length || 0} Nodes • {graphData?.links?.length || 0} Links
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex bg-app-bg/80 backdrop-blur rounded border border-app-border p-1">
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'graph' ? 'bg-app-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Graph View"
            >
              <Network size={18} />
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'charts' ? 'bg-app-primary text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Charts View"
            >
              <BarChart3 size={18} />
            </button>
          </div>
          
          <div className="flex-grow relative w-full h-full">
            {!loading && graphData?.nodes?.length > 0 ? (
              viewMode === 'graph' ? (
                <ForceGraph2D
                  ref={fgRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  graphData={getGraphDataWithWeights}
                  nodeLabel="id"
                  linkLabel="type"
                  
                  // Visibility Control
                  nodeVisibility={(node: any) => highlightNodes.size === 0 || highlightNodes.has(node.id)}
                  linkVisibility={(link: any) => highlightLinks.size === 0 || highlightLinks.has(link)}

                  // Node Styling
                  nodeColor={(node: any) => 
                    node.id === selectedNode 
                      ? '#FFFFFF' 
                      : (PLATFORMS.find(p => p.id === selectedPlatform)?.color || '#00F0FF')
                  }
                  nodeRelSize={1.5}
                  
                  // Link Styling
                  linkColor={() => '#2A2F45'}
                  linkWidth={(link: any) => highlightLinks.has(link) ? 2 : 1}
                  
                  // Link Animation (Arrows)
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkDirectionalParticles={(link: any) => highlightLinks.has(link) ? 4 : 0}
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleSpeed={0.005}
                  
                  // Node Labels on Highlight
                  nodeCanvasObjectMode={() => 'after'}
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    if (highlightNodes.has(node.id) || node.id === selectedNode) {
                      const label = node.id;
                      const fontSize = 12 / globalScale;
                      ctx.font = `${fontSize}px Sans-Serif`;
                      
                      // Calculate dimensions
                      const textWidth = ctx.measureText(label).width;
                      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5); // Add padding

                      // Calculate position (below the node)
                      const radius = (node.val || 3) * 1.5;
                      const textY = node.y + radius + fontSize;

                      // Draw background box
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                      ctx.fillRect(
                        node.x - bckgDimensions[0] / 2, 
                        textY - bckgDimensions[1] / 2, 
                        bckgDimensions[0], 
                        bckgDimensions[1]
                      );

                      // Draw text
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                      ctx.fillText(label, node.x, textY);
                    }
                  }}
                  
                  backgroundColor="#0F111A"
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleResetFilter}
                />
              ) : (
                <div className="p-6 h-full overflow-y-auto grid grid-rows-2 gap-6">
                  {/* Top Entities Bar Chart */}
                  <div className="bg-app-bg/30 p-4 rounded border border-app-border/50 flex flex-col">
                    <h4 className="text-white font-display mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-app-primary" />
                      Top 10 Influential Entities
                    </h4>
                    <div className="flex-grow min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.topNodes} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F45" horizontal={false} />
                          <XAxis type="number" stroke="#6B7280" fontSize={12} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            width={80}
                            tick={{ fill: '#E5E7EB' }} 
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0F111A', borderColor: '#2A2F45', color: '#fff' }}
                            itemStyle={{ color: '#00F0FF' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill={PLATFORMS.find(p => p.id === selectedPlatform)?.color || '#00F0FF'} 
                            radius={[0, 4, 4, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Community Size Treemap */}
                  <div className="bg-app-bg/30 p-4 rounded border border-app-border/50 flex flex-col">
                    <h4 className="text-white font-display mb-4 flex items-center gap-2">
                      <Users size={16} className="text-app-secondary" />
                      Topic Distribution (Top 15 Communities)
                    </h4>
                    <div className="flex-grow min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                          data={chartsData.communitySizes}
                          dataKey="size"
                          stroke="#0F111A"
                          fill="#0F111A"
                          content={<CustomizedContent />}
                        >
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-app-panel border border-app-border p-3 rounded shadow-xl z-50 max-w-xs">
                                    <p className="text-app-primary font-bold mb-1">{data.name}</p>
                                    <p className="text-gray-300 text-xs mb-2">Size: {data.size}</p>
                                    <p className="text-gray-400 text-xs line-clamp-3">{data.fullData?.summary}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </Treemap>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )
            ) : (
               <div className="flex items-center justify-center h-full text-gray-600 font-mono">
                  {loading ? 'Visualizing Data...' : 'No Data Available'}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

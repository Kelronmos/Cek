import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Maximize2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VectorVisualizationProps {
  currentVector: number[];
  currentVectorB?: number[];
  history: any[];
  onVectorChange?: (vector: number[]) => void;
  rules?: any;
  onAddKeyword?: (dim: string, type: 'pos' | 'neg', value: string) => void;
  onRemoveKeyword?: (dim: string, type: 'pos' | 'neg', keyword: string) => void;
  onEditKeyword?: (dim: string, type: 'pos' | 'neg', oldKeyword: string, newKeyword: string) => void;
}

const VectorPoint = ({ 
  vector, 
  isCurrent = false, 
  onHover, 
  isHighlighted = false,
  isDimmed = false,
  colorOverride,
  similarity = 0
}: { 
  vector: number[], 
  isCurrent?: boolean, 
  onHover?: (v: number[] | null) => void,
  isHighlighted?: boolean,
  isDimmed?: boolean,
  colorOverride?: string,
  similarity?: number
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = useMemo(() => {
    if (colorOverride) return new THREE.Color(colorOverride);
    const ethics = vector[3] || 0;
    return new THREE.Color().setHSL(ethics * 0.33, 1, 0.5);
  }, [vector, colorOverride]);

  useFrame((state) => {
    if (meshRef.current && materialRef.current) {
      // Calculate distance to camera for scale compensation
      const distance = state.camera.position.distanceTo(meshRef.current.position);
      // Compensation factor: as distance decreases (zoom in), we reduce world scale to keep screen size stable or smaller
      const scaleComp = Math.min(1, distance / 10); 

      // Smooth scale transition
      const baseScale = hovered ? 1.8 : 1;
      const targetScale = baseScale * scaleComp;
      const currentScale = meshRef.current.scale.x;
      const lerpFactor = 0.15;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpFactor);
      
      // Smooth emissive intensity transition
      const targetEmissive = hovered ? 6 : (isCurrent || isHighlighted ? 3 : 0.8);
      materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        materialRef.current.emissiveIntensity, 
        targetEmissive, 
        lerpFactor
      );

      // Pulse speed based on Sentiment (vector[5])
      const sentiment = vector[5] || 0.5;
      const basePulseSpeed = isCurrent ? 5 : 2;
      // If highlighted (similar point), we add extra pulse speed based on similarity
      const similarityBoost = isHighlighted ? similarity * 4 : 0;
      const pulseSpeed = (basePulseSpeed + similarityBoost) * (0.5 + sentiment); 

      if (isCurrent || isHighlighted) {
        // Similar points pulse more dramatically if they are closer to the hovered point
        const pulseScale = isCurrent ? 0.12 : (isHighlighted ? 0.05 + (similarity * 0.12) : 0.06);
        const pulse = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseScale;
        meshRef.current.scale.setScalar(newScale * pulse);
      } else {
        meshRef.current.scale.setScalar(newScale);
      }
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={[vector[0] * 5 - 2.5, vector[1] * 5 - 2.5, vector[2] * 5 - 2.5]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(vector);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null);
      }}
    >
      <sphereGeometry args={[isCurrent ? 0.2 : 0.08, 16, 16]} />
      <meshStandardMaterial 
        ref={materialRef}
        color={color} 
        emissive={color} 
        emissiveIntensity={0.5} 
        transparent 
        opacity={isHighlighted ? (similarity > 0 ? 0.4 + similarity * 0.6 : 1) : isDimmed ? 0.1 : isCurrent ? 1 : 0.5} 
      />
    </mesh>
  );
};

const Grid = () => {
  const xLabelRef = useRef<any>(null);
  const yLabelRef = useRef<any>(null);
  const zLabelRef = useRef<any>(null);
  const fineGridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    const distance = state.camera.position.length();
    // As we zoom in (distance decreases), elements become more opaque
    const opacity = Math.max(0, Math.min(1, 1 - (distance - 4) / 6));
    
    if (xLabelRef.current) xLabelRef.current.fillOpacity = opacity;
    if (yLabelRef.current) yLabelRef.current.fillOpacity = opacity;
    if (zLabelRef.current) zLabelRef.current.fillOpacity = opacity;
    
    if (fineGridRef.current) {
      (fineGridRef.current.material as THREE.LineBasicMaterial).opacity = opacity * 0.3;
      (fineGridRef.current.material as THREE.LineBasicMaterial).transparent = true;
    }
  });

  return (
    <group>
      <gridHelper args={[10, 10, 0x444444, 0x222222]} position={[0, -2.5, 0]} />
      <gridHelper ref={fineGridRef} args={[10, 50, 0x00ff41, 0x00ff41]} position={[0, -2.5, 0]} />
      <axesHelper args={[5]} />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text ref={xLabelRef} position={[3, 0, 0]} fontSize={0.2} color="#ff4444">
          SAFETY (X)
        </Text>
      </Float>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text ref={yLabelRef} position={[0, 3, 0]} fontSize={0.2} color="#44ff44">
          TRUTH (Y)
        </Text>
      </Float>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text ref={zLabelRef} position={[0, 0, 3]} fontSize={0.2} color="#4444ff">
          QUALITY (Z)
        </Text>
      </Float>
    </group>
  );
};

const isSameVector = (v1: number[], v2: number[]) => 
  v1 && v2 && v1.every((val, i) => Math.abs(val - v2[i]) < 0.001);

const SimilarityLine = ({ start, end, similarity }: { start: number[], end: number[], similarity: number }) => {
  const lineRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  
  // Use a power curve for more dramatic similarity falloff
  const targetOpacity = Math.pow(similarity, 1.5) * 0.8;
  const targetWidth = similarity * 4;

  const startPos = useMemo(() => [start[0] * 5 - 2.5, start[1] * 5 - 2.5, start[2] * 5 - 2.5] as [number, number, number], [start]);
  const endPos = useMemo(() => [end[0] * 5 - 2.5, end[1] * 5 - 2.5, end[2] * 5 - 2.5] as [number, number, number], [end]);

  useFrame((state) => {
    if (lineRef.current) {
      // Smoothly animate progress from 0 to 1
      const nextProgress = THREE.MathUtils.lerp(progress, 1, 0.08);
      if (Math.abs(nextProgress - progress) > 0.0001) {
        setProgress(nextProgress);
      }

      // Animate material properties
      lineRef.current.material.opacity = THREE.MathUtils.lerp(lineRef.current.material.opacity, targetOpacity * progress, 0.1);
      lineRef.current.material.linewidth = THREE.MathUtils.lerp(lineRef.current.material.linewidth, targetWidth, 0.1);
      
      // Flowing dash effect
      if (lineRef.current.material.dashOffset !== undefined) {
        lineRef.current.material.dashOffset -= 0.02;
      }
    }
  });

  // Calculate current end point based on animation progress
  const currentEnd = useMemo(() => [
    startPos[0] + (endPos[0] - startPos[0]) * progress,
    startPos[1] + (endPos[1] - startPos[1]) * progress,
    startPos[2] + (endPos[2] - startPos[2]) * progress
  ] as [number, number, number], [startPos, endPos, progress]);

  return (
    <group>
      {/* Glow effect line */}
      <Line
        points={[startPos, currentEnd]}
        color="#00ff41"
        lineWidth={targetWidth * 2}
        transparent
        opacity={targetOpacity * 0.15 * progress}
        depthWrite={false}
      />
      {/* Main data stream line */}
      <Line
        ref={lineRef}
        points={[startPos, currentEnd]}
        color="#00ff41"
        lineWidth={0}
        transparent
        opacity={0}
        depthWrite={false}
        dashed
        dashScale={2}
        dashSize={0.5}
        gapSize={0.2}
      />
    </group>
  );
};

const Scene = ({ currentVector, currentVectorB, history }: VectorVisualizationProps) => {
  const [hoveredVector, setHoveredVector] = useState<number[] | null>(null);

  const calculateDistance = (v1: number[], v2: number[]) => {
    return Math.sqrt(
      Math.pow(v1[0] - v2[0], 2) +
      Math.pow(v1[1] - v2[1], 2) +
      Math.pow(v1[2] - v2[2], 2) +
      Math.pow(v1[3] - v2[3], 2) +
      Math.pow(v1[4] - v2[4], 2) +
      Math.pow((v1[5] || 0) - (v2[5] || 0), 2)
    );
  };

  const SIMILARITY_THRESHOLD = 0.5;

  const similarPoints = useMemo(() => {
    if (!hoveredVector) return [];
    const points = [...history.map(h => h.vector), currentVector];
    return points
      .map(v => ({
        vector: v,
        distance: calculateDistance(v, hoveredVector)
      }))
      .filter(p => !isSameVector(p.vector, hoveredVector) && p.distance < SIMILARITY_THRESHOLD)
      .sort((a, b) => a.distance - b.distance);
  }, [hoveredVector, history, currentVector]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Grid />
      
      {/* Similarity Lines */}
      {hoveredVector && similarPoints.map((p, i) => (
        <SimilarityLine
          key={`${hoveredVector.join('-')}-${p.vector.join('-')}-${i}`}
          start={hoveredVector}
          end={p.vector}
          similarity={1 - (p.distance / SIMILARITY_THRESHOLD)}
        />
      ))}

      {/* History points */}
      {history.slice(-30).map((entry, i) => {
        const isHovered = hoveredVector && isSameVector(entry.vector, hoveredVector);
        const similarPoint = similarPoints.find(p => isSameVector(p.vector, entry.vector));
        const isHighlighted = !!(isHovered || similarPoint);
        const similarity = isHovered ? 1 : (similarPoint ? 1 - (similarPoint.distance / SIMILARITY_THRESHOLD) : 0);
        const isDimmed = hoveredVector ? !isHighlighted : false;
        
        return (
          <VectorPoint 
            key={i} 
            vector={entry.vector} 
            onHover={setHoveredVector}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            similarity={similarity}
          />
        );
      })}
      
      {/* Current point */}
      {(() => {
        const isHovered = hoveredVector && isSameVector(currentVector, hoveredVector);
        const similarPoint = similarPoints.find(p => isSameVector(p.vector, currentVector));
        const isHighlighted = !!(isHovered || similarPoint);
        const similarity = isHovered ? 1 : (similarPoint ? 1 - (similarPoint.distance / SIMILARITY_THRESHOLD) : 0);
        const isDimmed = hoveredVector ? !isHighlighted : false;
        
        return (
          <VectorPoint 
            vector={currentVector} 
            isCurrent 
            onHover={setHoveredVector}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            similarity={similarity}
          />
        );
      })()}

      {/* Comparison point */}
      {currentVectorB && (() => {
        const isHovered = hoveredVector && isSameVector(currentVectorB, hoveredVector);
        const similarPoint = similarPoints.find(p => isSameVector(p.vector, currentVectorB));
        const isHighlighted = !!(isHovered || similarPoint);
        const similarity = isHovered ? 1 : (similarPoint ? 1 - (similarPoint.distance / SIMILARITY_THRESHOLD) : 0);
        const isDimmed = hoveredVector ? !isHighlighted : false;

        return (
          <VectorPoint 
            vector={currentVectorB} 
            isCurrent 
            colorOverride="#00e5ff" // Cyan for model B
            onHover={setHoveredVector}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            similarity={similarity}
          />
        );
      })()}
      
      {/* Ideal Target */}
      <mesh position={[2.5, 2.5, 2.5]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#ffffff" wireframe />
      </mesh>
      
      <OrbitControls makeDefault />
      <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
    </>
  );
};

export const VectorVisualization: React.FC<VectorVisualizationProps> = ({ 
  currentVector: propVector, 
  currentVectorB,
  history, 
  onVectorChange,
  rules,
  onAddKeyword,
  onRemoveKeyword,
  onEditKeyword
}) => {
  const [localVector, setLocalVector] = useState(propVector);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'keywords'>('manual');
  const [editingKeyword, setEditingKeyword] = useState<{ dim: string, type: 'pos' | 'neg', value: string } | null>(null);
  const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});
  const debounceRef = useRef<number | null>(null);

  // Sync local vector with prop vector when prop vector changes from outside (e.g. evaluation)
  useEffect(() => {
    setLocalVector(propVector);
  }, [propVector]);

  const handleSliderChange = (index: number, value: number) => {
    const newVector = [...localVector];
    newVector[index] = Math.max(0, Math.min(1, value));
    setLocalVector(newVector);
    
    // Use a small timeout to debounce the parent update
    // This keeps the 3D visualization responsive while the parent App might be heavy to re-render
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onVectorChange?.(newVector);
    }, 16); // ~1 frame delay for parent sync
  };

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden border border-[#262626] relative group">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-[10px] font-mono text-[#00ff41] uppercase tracking-widest bg-black/60 px-2 py-1 rounded border border-[#00ff41]/20">
          6D Vector Projection
        </h3>
        <p className="text-[8px] font-mono text-zinc-500 mt-1 uppercase">
          X: Safety | Y: Truth | Z: Quality | Color: Ethics | Size: Engagement | Pulse: Sentiment
        </p>
      </div>

      {/* Controls Toggle */}
      <button 
        onClick={() => setIsControlsOpen(!isControlsOpen)}
        className={cn(
          "absolute top-4 right-4 z-30 p-2 rounded border transition-all duration-300",
          isControlsOpen ? "bg-[#00ff41] text-black border-[#00ff41]" : "bg-black/60 text-[#00ff41] border-[#00ff41]/20 hover:bg-[#00ff41]/10"
        )}
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      {/* Manual Controls Overlay */}
      <div className={cn(
        "absolute top-4 right-4 z-20 flex flex-col gap-3 bg-black/95 p-4 rounded-lg border border-[#262626] transition-all duration-300 w-64 max-h-[90%] overflow-hidden",
        isControlsOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
      )}>
        <div className="flex items-center justify-between mb-2 border-b border-[#262626] pb-2">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('manual')}
              className={cn(
                "text-[9px] font-mono uppercase tracking-wider pb-1 transition-colors",
                activeTab === 'manual' ? "text-[#00ff41] border-b border-[#00ff41]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Manual
            </button>
            <button 
              onClick={() => setActiveTab('keywords')}
              className={cn(
                "text-[9px] font-mono uppercase tracking-wider pb-1 transition-colors",
                activeTab === 'keywords' ? "text-[#00ff41] border-b border-[#00ff41]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Keywords
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto pr-1 custom-scrollbar flex-1">
          {activeTab === 'manual' ? (
            <div className="space-y-3">
              {[
                { label: 'Safety', color: 'text-red-500' },
                { label: 'Truth', color: 'text-green-500' },
                { label: 'Quality', color: 'text-blue-500' },
                { label: 'Ethics', color: 'text-yellow-500' },
                { label: 'Engagement', color: 'text-orange-500' },
                { label: 'Sentiment', color: 'text-purple-500' }
              ].map((axis, i) => (
                <div key={axis.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] font-mono ${axis.color} uppercase tracking-tighter`}>{axis.label}</span>
                    <input 
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(localVector[i] ?? 0.5).toFixed(2)}
                      onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 text-[8px] font-mono text-white w-10 px-1 py-0.5 rounded focus:outline-none focus:border-[#00ff41]/50"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={localVector[i] ?? 0.5}
                    onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00ff41]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {rules && Object.keys(rules).map((dim) => (
                <div key={dim} className="space-y-3 border-b border-[#1a1a1a] pb-3 last:border-0">
                  <h5 className="text-[9px] font-mono font-bold text-[#00ff41] uppercase">{dim}</h5>
                  
                  {/* Positive */}
                  <div className="space-y-1.5">
                    <p className="text-[7px] font-mono text-zinc-600 uppercase">Positive</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(rules[dim].pos)).map((kw: string, i: number) => (
                        <div key={`${dim}-pos-${kw}-${i}`} className="group relative">
                          {editingKeyword?.dim === dim && editingKeyword?.type === 'pos' && editingKeyword?.value === kw ? (
                            <input 
                              autoFocus
                              className="bg-black border border-[#00ff41] text-[#00ff41] text-[8px] px-1 py-0.5 rounded w-16 focus:outline-none"
                              defaultValue={kw}
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== kw) {
                                  onEditKeyword?.(dim, 'pos', kw, e.target.value);
                                }
                                setEditingKeyword(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (e.currentTarget.value && e.currentTarget.value !== kw) {
                                    onEditKeyword?.(dim, 'pos', kw, e.currentTarget.value);
                                  }
                                  setEditingKeyword(null);
                                }
                                if (e.key === 'Escape') setEditingKeyword(null);
                              }}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingKeyword({ dim, type: 'pos', value: kw })}
                              className="bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-[#00ff41]/10"
                            >
                              {kw}
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveKeyword?.(dim, 'pos', kw); }}
                                className="hover:text-white opacity-40 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <input 
                        type="text" 
                        placeholder="Add..."
                        className="flex-1 bg-black border border-[#262626] rounded px-1.5 py-0.5 text-[8px] font-mono focus:outline-none focus:border-[#00ff41]/50"
                        value={newKeywordInputs[`${dim}-pos`] || ''}
                        onChange={(e) => setNewKeywordInputs(prev => ({ ...prev, [`${dim}-pos`]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newKeywordInputs[`${dim}-pos`]?.trim()) {
                            onAddKeyword?.(dim, 'pos', newKeywordInputs[`${dim}-pos`].trim());
                            setNewKeywordInputs(prev => ({ ...prev, [`${dim}-pos`]: '' }));
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Negative */}
                  <div className="space-y-1.5">
                    <p className="text-[7px] font-mono text-zinc-600 uppercase">Negative</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(rules[dim].neg)).map((kw: string, i: number) => (
                        <div key={`${dim}-neg-${kw}-${i}`} className="group relative">
                          {editingKeyword?.dim === dim && editingKeyword?.type === 'neg' && editingKeyword?.value === kw ? (
                            <input 
                              autoFocus
                              className="bg-black border border-[#ff3333] text-[#ff3333] text-[8px] px-1 py-0.5 rounded w-16 focus:outline-none"
                              defaultValue={kw}
                              onBlur={(e) => {
                                if (e.target.value && e.target.value !== kw) {
                                  onEditKeyword?.(dim, 'neg', kw, e.target.value);
                                }
                                setEditingKeyword(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (e.currentTarget.value && e.currentTarget.value !== kw) {
                                    onEditKeyword?.(dim, 'neg', kw, e.currentTarget.value);
                                  }
                                  setEditingKeyword(null);
                                }
                                if (e.key === 'Escape') setEditingKeyword(null);
                              }}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingKeyword({ dim, type: 'neg', value: kw })}
                              className="bg-[#ff3333]/5 border border-[#ff3333]/20 text-[#ff3333] text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-[#ff3333]/10"
                            >
                              {kw}
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveKeyword?.(dim, 'neg', kw); }}
                                className="hover:text-white opacity-40 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <input 
                        type="text" 
                        placeholder="Add..."
                        className="flex-1 bg-black border border-[#262626] rounded px-1.5 py-0.5 text-[8px] font-mono focus:outline-none focus:border-[#ff3333]/50"
                        value={newKeywordInputs[`${dim}-neg`] || ''}
                        onChange={(e) => setNewKeywordInputs(prev => ({ ...prev, [`${dim}-neg`]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newKeywordInputs[`${dim}-neg`]?.trim()) {
                            onAddKeyword?.(dim, 'neg', newKeywordInputs[`${dim}-neg`].trim());
                            setNewKeywordInputs(prev => ({ ...prev, [`${dim}-neg`]: '' }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#262626]">
          <button 
            onClick={() => {
              setLocalVector(propVector);
              onVectorChange?.(propVector);
            }}
            className="text-[8px] font-mono text-zinc-500 hover:text-white uppercase border border-zinc-800 py-1.5 rounded transition-colors"
          >
            Reset
          </button>
          <button 
            onClick={() => setIsControlsOpen(false)}
            className="text-[8px] font-mono text-zinc-500 hover:text-white uppercase border border-zinc-800 py-1.5 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      <Canvas dpr={[1, 2]}>
        <Scene currentVector={localVector} currentVectorB={currentVectorB} history={history} />
      </Canvas>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff41]" />
          <span className="text-[8px] font-mono text-zinc-500 uppercase">Ethical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff3333]" />
          <span className="text-[8px] font-mono text-zinc-500 uppercase">Unethical</span>
        </div>
      </div>
    </div>
  );
};

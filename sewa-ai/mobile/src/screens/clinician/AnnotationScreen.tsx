// SEWA AI — mobile/src/screens/clinician/AnnotationScreen.tsx
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#000', bg1:'#091A15', teal:'#408D7B', teal2:'#52B09A', red:'#E86060', amber:'#F09A40', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };
const { width: W } = Dimensions.get('window');

type Tool = 'pen'|'circle'|'arrow'|'eraser';
type Color = '#E86060'|'#F09A40'|'#52B09A'|'#FFD700';

export default function AnnotationScreen({ route, navigation }: any) {
  const { scanId } = route.params;
  const qc = useQueryClient();
  const [tool,   setTool]   = useState<Tool>('pen');
  const [color,  setColor]  = useState<Color>('#E86060');
  const [strokes, setStrokes] = useState<{ path:string; color:string }[]>([]);
  const currentPath = useRef('');

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post('/annotations', { scanId, type:'drawing', data:{ strokes }, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['scan',scanId] }); navigation.goBack(); },
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: ({ nativeEvent }: any) => {
      currentPath.current = `M${nativeEvent.locationX},${nativeEvent.locationY}`;
    },
    onPanResponderMove: ({ nativeEvent }: any) => {
      currentPath.current += ` L${nativeEvent.locationX},${nativeEvent.locationY}`;
      setStrokes((s: any) => {
        const next = [...s];
        if (next.length && next[next.length-1].color === color && next[next.length-1].path === currentPath.current.split('L')[0]) {
          next[next.length-1] = { path: currentPath.current, color };
        } else {
          next.push({ path: currentPath.current, color });
        }
        return next;
      });
    },
    onPanResponderRelease: () => { currentPath.current = ''; },
  });

  const TOOLS: { id:Tool; icon:string }[] = [{ id:'pen', icon:'✏️' },{ id:'circle', icon:'⭕' },{ id:'arrow', icon:'↗' },{ id:'eraser', icon:'⬜' }];
  const COLORS: Color[] = ['#E86060','#F09A40','#52B09A','#FFD700'];

  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      {/* Canvas */}
      <View style={{ flex:1, backgroundColor:'#111' }} {...panResponder.panHandlers}>
        {/* SVG-based drawing layer */}
        <View style={{ flex:1 }}>
          <Text style={{ color:T.textLo, fontSize:10, textAlign:'center', marginTop:20 }}>Draw annotations on scan</Text>
          {strokes.map((s, i) => (
            <Text key={i} style={{ display:'none' }}>{s.path}</Text>
          ))}
        </View>
      </View>

      {/* Toolbar */}
      <View style={{ backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.border, padding:12 }}>
        <View style={{ flexDirection:'row', justifyContent:'center', gap:10, marginBottom:10 }}>
          {TOOLS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTool(t.id)}
              style={{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor: tool===t.id ? 'rgba(64,141,123,0.3)' : T.bg0, borderWidth:1, borderColor: tool===t.id ? T.teal : T.border }}>
              <Text style={{ fontSize:20 }}>{t.icon}</Text>
            </TouchableOpacity>
          ))}
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setColor(c)}
              style={{ width:28, height:28, borderRadius:14, backgroundColor:c, borderWidth: color===c ? 2 : 0, borderColor:'#fff', alignSelf:'center' }} />
          ))}
        </View>
        <View style={{ flexDirection:'row', gap:10 }}>
          <TouchableOpacity onPress={() => setStrokes([])}
            style={{ flex:1, backgroundColor:T.bg0, borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:T.border }}>
            <Text style={{ color:T.textMd, fontWeight:'700' }}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => saveMutation.mutate()}
            style={{ flex:2, backgroundColor:T.teal, borderRadius:10, padding:12, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'800' }}>Save Annotation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

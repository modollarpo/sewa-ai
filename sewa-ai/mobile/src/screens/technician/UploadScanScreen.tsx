// SEWA AI — mobile/src/screens/technician/UploadScanScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', amber:'#D47820' };

const MODALITIES = ['CT','MRI','XR','US','NM','PET'];
const BODY_PARTS = ['Head','Chest','Abdomen','Spine','Pelvis','Extremity','Neck'];
const PRIORITIES  = ['ROUTINE','URGENT','STAT'];

export default function UploadScanScreen() {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName:'', lastName:'', mrn:'', dob:'', sex:'M', modality:'CT', bodyPart:'Head', priority:'ROUTINE', indication:'', patientEmail:'' });
  const [file, setFile] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('firstName', form.firstName); fd.append('lastName', form.lastName);
      fd.append('mrn', form.mrn); fd.append('dob', form.dob); fd.append('sex', form.sex);
      fd.append('modality', form.modality); fd.append('bodyPart', form.bodyPart);
      fd.append('priority', form.priority); fd.append('indication', form.indication);
      if (file) fd.append('dicom', { uri:file.uri, type:file.type||'application/dicom', name:file.name } as any);
      return apiClient.post('/scans/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey:['worklist'] });
      Alert.alert('Scan Uploaded', `Scan ${res.data.scan?.id?.slice(0,12)} queued for AI triage.`, [{ text:'Upload Another', onPress:()=>{ setStep(1); setForm({ firstName:'', lastName:'', mrn:'', dob:'', sex:'M', modality:'CT', bodyPart:'Head', priority:'ROUTINE', indication:'', patientEmail:'' }); setFile(null); } }]);
    },
    onError: (e:any) => Alert.alert('Upload Failed', e.response?.data?.message || 'Please try again'),
  });

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type:[DocumentPicker.types.allFiles] });
      setFile(res);
    } catch (e) { if (!DocumentPicker.isCancel(e)) Alert.alert('Error', 'Could not pick file'); }
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const STEPS = ['Patient', 'Scan', 'Upload'];

  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      {/* Header + progress */}
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900', marginBottom:12 }}>Upload Scan</Text>
        <View style={{ flexDirection:'row', gap:4, alignItems:'center' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={{ flex:1, height:4, borderRadius:2, backgroundColor: step>i ? T.teal : T.bg2 }} />
              {i < STEPS.length-1 && <View style={{ width:6, height:6, borderRadius:3, backgroundColor: step>i+1 ? T.teal : T.border }} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={{ color:T.textMd, fontSize:11, marginTop:6 }}>Step {step} of {STEPS.length}: {STEPS[step-1]}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        {/* Step 1: Patient */}
        {step === 1 && (
          <View style={{ gap:14 }}>
            <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, fontFamily:'Courier' }}>PATIENT INFORMATION</Text>
            {([['First Name','firstName','given-name'],['Last Name','lastName','family-name'],['MRN','mrn','off'],['Email (optional)','patientEmail','email']] as const).map(([label, key, ac]) => (
              <View key={key}><Text style={{ color:T.textMd, fontSize:12, marginBottom:5 }}>{label}</Text>
              <TextInput value={(form as any)[key]} onChangeText={v=>set(key,v)}
                autoComplete={ac as any} style={{ backgroundColor:T.bg1, borderRadius:10, padding:12, color:T.textHi, fontSize:13, borderWidth:1, borderColor:T.border }} /></View>
            ))}
            <View><Text style={{ color:T.textMd, fontSize:12, marginBottom:5 }}>Sex</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              {['M','F','O'].map(s => <TouchableOpacity key={s} onPress={()=>set('sex',s)}
                style={{ flex:1, borderRadius:10, padding:12, alignItems:'center', backgroundColor:form.sex===s?T.teal:T.bg1, borderWidth:1, borderColor:form.sex===s?T.teal:T.border }}>
                <Text style={{ color:form.sex===s?'#fff':T.textMd, fontWeight:'700' }}>{s==='M'?'Male':s==='F'?'Female':'Other'}</Text>
              </TouchableOpacity>)}
            </View></View>
            <TouchableOpacity onPress={()=>setStep(2)} disabled={!form.firstName||!form.lastName}
              style={{ backgroundColor:(!form.firstName||!form.lastName)?T.bg2:T.teal, borderRadius:12, padding:14, alignItems:'center' }}>
              <Text style={{ color:(!form.firstName||!form.lastName)?T.textLo:'#fff', fontWeight:'800' }}>Next: Scan Details →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Scan details */}
        {step === 2 && (
          <View style={{ gap:14 }}>
            <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, fontFamily:'Courier' }}>SCAN DETAILS</Text>
            {([['Modality', 'modality', MODALITIES],['Body Part','bodyPart',BODY_PARTS],['Priority','priority',PRIORITIES]] as const).map(([label,key,opts]) => (
              <View key={key}><Text style={{ color:T.textMd, fontSize:12, marginBottom:6 }}>{label}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                {(opts as string[]).map(o => <TouchableOpacity key={o} onPress={()=>set(key,o)}
                  style={{ borderRadius:8, paddingHorizontal:12, paddingVertical:7, backgroundColor:(form as any)[key]===o?T.teal:T.bg1, borderWidth:1, borderColor:(form as any)[key]===o?T.teal:T.border }}>
                  <Text style={{ color:(form as any)[key]===o?'#fff':T.textMd, fontSize:12, fontWeight:'600' }}>{o}</Text>
                </TouchableOpacity>)}
              </View></View>
            ))}
            <View><Text style={{ color:T.textMd, fontSize:12, marginBottom:5 }}>Clinical Indication</Text>
            <TextInput value={form.indication} onChangeText={v=>set('indication',v)} multiline numberOfLines={3} placeholder="Reason for scan..."
              placeholderTextColor={T.textLo} style={{ backgroundColor:T.bg1, borderRadius:10, padding:12, color:T.textHi, fontSize:13, borderWidth:1, borderColor:T.border, textAlignVertical:'top', minHeight:80 }} /></View>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={()=>setStep(1)} style={{ flex:1, backgroundColor:T.bg2, borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:T.border }}>
                <Text style={{ color:T.textMd, fontWeight:'700' }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setStep(3)} style={{ flex:2, backgroundColor:T.teal, borderRadius:12, padding:14, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>Next: Upload →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: File upload */}
        {step === 3 && (
          <View style={{ gap:14 }}>
            <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, fontFamily:'Courier' }}>DICOM FILE</Text>
            <TouchableOpacity onPress={pickFile}
              style={{ backgroundColor:T.bg1, borderRadius:14, padding:28, alignItems:'center', borderWidth:2, borderColor:file?T.teal:T.border, borderStyle:file?'solid':'dashed' }}>
              <Text style={{ fontSize:36, marginBottom:10 }}>{file ? '📂' : '⬆️'}</Text>
              <Text style={{ color: file ? T.teal2 : T.textMd, fontSize:14, fontWeight:'700', marginBottom:4 }}>
                {file ? file.name : 'Tap to select DICOM file'}
              </Text>
              <Text style={{ color:T.textLo, fontSize:11 }}>{file ? `${(file.size/1024/1024).toFixed(1)} MB` : '.dcm · .zip · .nii · .nii.gz'}</Text>
            </TouchableOpacity>

            {/* Summary */}
            <View style={{ backgroundColor:T.bg1, borderRadius:12, padding:14, borderWidth:1, borderColor:T.border }}>
              <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:10, fontFamily:'Courier' }}>SUMMARY</Text>
              {[['Patient', `${form.firstName} ${form.lastName}`],['MRN', form.mrn||'—'],['Scan', `${form.modality} ${form.bodyPart}`],['Priority', form.priority]].map(([k,v]) => (
                <View key={k} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:5, borderBottomWidth:1, borderBottomColor:T.bg2 }}>
                  <Text style={{ color:T.textLo, fontSize:12 }}>{k}</Text>
                  <Text style={{ color:T.textMd, fontSize:12, fontWeight:'600' }}>{v}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={()=>setStep(2)} style={{ flex:1, backgroundColor:T.bg2, borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:T.border }}>
                <Text style={{ color:T.textMd, fontWeight:'700' }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>uploadMutation.mutate()} disabled={uploadMutation.isPending}
                style={{ flex:2, backgroundColor:form.priority==='STAT'?T.red:T.teal, borderRadius:12, padding:14, alignItems:'center' }}>
                {uploadMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color:'#fff', fontWeight:'800' }}>Submit Scan ⚡</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

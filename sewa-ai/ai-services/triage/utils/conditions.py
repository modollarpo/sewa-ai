# SEWA AI — ai-services/triage/utils/conditions.py
# Condition label maps per modality + body part

CONDITION_MAP = {
    "CT_Head": [
        "Normal", "ICH", "Ischemic Stroke", "Hemorrhagic Stroke",
        "Subdural Hematoma", "Epidural Hematoma", "Subarachnoid Hemorrhage",
        "Cerebral Edema", "Mass Effect", "Hydrocephalus",
    ],
    "CT_Chest": [
        "Normal", "Pulmonary Embolism", "Pneumothorax", "Pleural Effusion",
        "Pneumonia", "Lung Mass", "Aortic Dissection", "Pericardial Effusion",
        "Rib Fracture", "COVID-19 Pattern",
    ],
    "CT_Abdomen": [
        "Normal", "Bowel Perforation", "Appendicitis", "Splenic Laceration",
        "Bowel Obstruction", "Aortic Aneurysm", "Ascites", "Liver Lesion",
    ],
    "MRI_Brain": [
        "Normal", "Ischemic Stroke", "Brain Tumor", "Multiple Sclerosis",
        "Encephalitis", "Metastasis", "Cerebral Abscess", "Dementia",
    ],
    "MRI_Spine": [
        "Normal", "Disc Herniation", "Spinal Stenosis", "Cord Compression",
        "Fracture", "Tumor", "Spondylolisthesis",
    ],
    "XR_Chest": [
        "Normal", "Pneumonia", "TB", "Pneumothorax", "Pleural Effusion",
        "Cardiomegaly", "Lung Mass", "Atelectasis",
    ],
    "US_Abdomen": [
        "Normal", "Gallstones", "Appendicitis", "Liver Lesion",
        "Ascites", "Kidney Stone", "AAA",
    ],
    "default": [
        "Normal", "Abnormal - Unclassified", "Critical Finding",
        "Urgent Finding", "Incidental Finding",
    ],
}

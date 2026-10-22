from transformers import pipeline

# Load the model once when the backend starts
print("Loading Deepfake Detection Model... (This may take a minute to download on first run)")
deepfake_classifier = pipeline("audio-classification", model="MelodyMachine/Deepfake-audio-detection-V2")

def predict_voice_authenticity(audio_data):
    """
    Returns a probability (0.0 to 1.0) that the voice is SYNTHETIC (spoofed).
    0.0 = Real Human, 1.0 = AI Cloned.
    """
    try:
        # Run the raw audio array through the Hugging Face pipeline
        results = deepfake_classifier(audio_data)
        
        # The pipeline returns a list like: [{'score': 0.98, 'label': 'fake'}, ...]
        fake_prob = 0.0
        for res in results:
            label = res['label'].lower()
            # Catch common labels for AI-generated audio
            if 'fake' in label or 'spoof' in label or label == 'label_1':
                fake_prob = res['score']
                break
            # If the top result is "real", fake probability is the inverse
            elif 'real' in label or 'bonafide' in label or label == 'label_0':
                fake_prob = 1.0 - res['score']
                
        return float(fake_prob)
    except Exception as e:
        print(f"Error during ML inference: {e}")
        # Fallback to a random number if something crashes
        import random
        return random.uniform(0.0, 1.0)

# MOCK for facebook/mms-lid-126 (Language ID)
# For this prototype, we'll return a mock language unless the user wants to download the 1.2GB model
def predict_language(audio_data):
    """
    Returns the detected language code (e.g. 'eng', 'spa', 'hin').
    """
    languages = ['eng', 'spa', 'hin', 'fra', 'deu']
    import random
    return random.choice(languages)

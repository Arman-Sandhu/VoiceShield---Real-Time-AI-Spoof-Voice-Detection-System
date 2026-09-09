import random
import os

# MOCK for facebook/wav2vec2-xls-r-300m
# When swapping in fine-tuned model, replace this function
def predict_voice_authenticity(audio_data):
    """
    Returns a probability (0.0 to 1.0) that the voice is SYNTHETIC (spoofed).
    0.0 = Real Human, 1.0 = AI Cloned.
    """
    # MOCK implementation: random float between 0 and 1
    # In production, this will pass audio_data through the wav2vec2-xls-r-300m model
    return random.uniform(0.0, 1.0)

# MOCK for facebook/mms-lid-126 (Language ID)
# For this prototype, we'll return a mock language unless the user wants to download the 1.2GB model
def predict_language(audio_data):
    """
    Returns the detected language code (e.g. 'eng', 'spa', 'hin').
    """
    languages = ['eng', 'spa', 'hin', 'fra', 'deu']
    return random.choice(languages)

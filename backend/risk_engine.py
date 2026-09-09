def calculate_risk(voice_score: float, is_caller_unknown: bool, is_sensitive_request: bool, urgency_flag: bool):
    """
    Calculates final risk level based on voice authenticity score and context.
    voice_score: 0.0 (real) to 1.0 (fake)
    """
    # Context score out of 3
    context_count = sum([is_caller_unknown, is_sensitive_request, urgency_flag])
    
    final_risk = "LOW"
    
    if voice_score > 0.8:
        # Very high chance of AI clone
        if context_count >= 1:
            final_risk = "CRITICAL"
        else:
            final_risk = "HIGH"
    elif voice_score > 0.5:
        # Suspicious
        if context_count >= 2:
            final_risk = "HIGH"
        elif context_count == 1:
            final_risk = "MEDIUM"
        else:
            final_risk = "MEDIUM"
    else:
        # Likely real
        if context_count == 3:
            final_risk = "MEDIUM"
        else:
            final_risk = "LOW"
            
    return {
        "final_risk": final_risk,
        "context_risk_count": context_count
    }

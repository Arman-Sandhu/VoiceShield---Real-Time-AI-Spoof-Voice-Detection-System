import logging
from typing import Dict, Any

logger = logging.getLogger("voiceshield.risk_service")

def assess_contextual_risk(
    fake_score: float,
    prediction: str,
    is_caller_unknown: bool,
    is_sensitive_request: bool,
    urgency_flag: bool
) -> Dict[str, Any]:
    """
    Evaluates risk by combining objective acoustic spoof score with situational call context.
    
    Acoustic classification and contextual risk remain distinct assessments:
    - fake_score: Acoustic model probability estimate (0.0 - 1.0)
    - context_flags: Situational high-pressure social engineering indicators (0 - 3)
    
    Risk Level Decision Matrix:
    - CRITICAL: High synthetic score (>0.75) + 1+ contextual flags OR moderate synthetic score (>0.50) + 3 contextual flags.
    - HIGH: High synthetic score (>0.75) without flags OR moderate synthetic score (>0.50) with 1-2 flags OR 3 contextual flags on human voice.
    - MEDIUM: Moderate synthetic score (>0.50) without flags OR human voice with 1-2 contextual flags.
    - LOW: Human speech prediction (<0.50) with zero contextual flags.
    """
    context_count = int(is_caller_unknown) + int(is_sensitive_request) + int(urgency_flag)

    # Context threat categorization
    if context_count >= 2:
        context_level = "HIGH"
    elif context_count == 1:
        context_level = "MEDIUM"
    else:
        context_level = "LOW"

    # Inconclusive prediction handling
    if prediction == "INCONCLUSIVE":
        if context_count >= 2:
            final_risk = "HIGH"
            explanation = "Elevated risk: Audio sample was inconclusive or silent, but the call exhibits strong suspicious social engineering indicators (urgency/sensitive data)."
        elif context_count == 1:
            final_risk = "MEDIUM"
            explanation = "Moderate risk: Audio authenticity could not be verified from the clip, and situational flags were present."
        else:
            final_risk = "LOW"
            explanation = "Inconclusive audio: The acoustic sample could not be classified, but no contextual risk flags were indicated."
        
        return {
            "final_risk": final_risk,
            "context_risk_level": context_level,
            "context_flags_count": context_count,
            "risk_explanation": explanation,
            "flags": {
                "is_caller_unknown": is_caller_unknown,
                "is_sensitive_request": is_sensitive_request,
                "urgency_flag": urgency_flag
            }
        }

    # Combined decision rules
    if fake_score >= 0.75:
        # Strong synthetic speech indicators
        if context_count >= 1:
            final_risk = "CRITICAL"
            reasons = []
            if is_sensitive_request:
                reasons.append("financial/sensitive credential requests")
            if urgency_flag:
                reasons.append("high psychological urgency")
            if is_caller_unknown:
                reasons.append("unverified caller identity")
            explanation = f"CRITICAL RISK: High probability of synthetic voice detected ({fake_score * 100:.1f}%) combined with {', '.join(reasons)}. Do not disclose information or authorize transactions."
        else:
            final_risk = "HIGH"
            explanation = f"HIGH RISK: Audio exhibits strong acoustic markers of AI voice generation ({fake_score * 100:.1f}%), though no immediate pressure tactics were flagged."

    elif fake_score >= 0.50:
        # Moderate synthetic speech indicators
        if context_count >= 2:
            final_risk = "CRITICAL"
            explanation = f"CRITICAL RISK: Audio classified as potentially synthetic ({fake_score * 100:.1f}%) accompanied by multiple social engineering tactics."
        elif context_count == 1:
            final_risk = "HIGH"
            explanation = f"HIGH RISK: Potential synthetic voice features detected alongside suspicious call circumstances."
        else:
            final_risk = "MEDIUM"
            explanation = f"MEDIUM RISK: Voice sample exhibits moderate synthetic acoustic patterns ({fake_score * 100:.1f}%). Verify identity through an independent secondary channel."

    else:
        # Human speech classification
        if context_count >= 3:
            final_risk = "HIGH"
            explanation = "HIGH RISK: Voice acoustic characteristics align with human speech, but the call scenario presents extreme social engineering risks (unknown caller, urgency, credential request)."
        elif context_count >= 1:
            final_risk = "MEDIUM"
            reasons = []
            if is_sensitive_request: reasons.append("sensitive data/money request")
            if urgency_flag: reasons.append("urgency tactics")
            if is_caller_unknown: reasons.append("unknown identity")
            explanation = f"MEDIUM RISK: Voice appears natural/human, but contextual warning flags ({', '.join(reasons)}) warrant caution."
        else:
            final_risk = "LOW"
            explanation = "LOW RISK: Voice exhibits natural human acoustic patterns with no reported situational threat indicators."

    return {
        "final_risk": final_risk,
        "context_risk_level": context_level,
        "context_flags_count": context_count,
        "risk_explanation": explanation,
        "flags": {
            "is_caller_unknown": is_caller_unknown,
            "is_sensitive_request": is_sensitive_request,
            "urgency_flag": urgency_flag
        }
    }

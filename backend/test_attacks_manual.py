from signatures import sign_message, verify_signature
from attacks import (
    simulate_forgery_attack,
    simulate_impersonation_attack,
    submit_signature,
    simulate_channel_manipulation_attack,
)

message = "Transfer 500 credits to Bob"
private_key = "alice-secret-key-123"

print("=== BASELINE (clean) ===")
clean_states = sign_message(message, private_key, num_copies=20)
print(verify_signature(message, private_key, clean_states))

print("\n=== FORGERY ===")
forged_states, fake_key = simulate_forgery_attack(message, num_copies=20)
print(verify_signature(message, private_key, forged_states))

print("\n=== IMPERSONATION ===")
impersonated_states = simulate_impersonation_attack(message, private_key, num_copies=20)
print(verify_signature(message, private_key, impersonated_states))

print("\n=== REPLAY ===")
sig_id = "sig-txn-00042"
print("First submission:", submit_signature(message, private_key, sig_id, clean_states, verify_signature)["status"])
print("Second submission (replay):", submit_signature(message, private_key, sig_id, clean_states, verify_signature))

print("\n=== CHANNEL MANIPULATION ===")
manipulated_states = simulate_channel_manipulation_attack(message, private_key, num_copies=20)
print(verify_signature(message, private_key, manipulated_states))
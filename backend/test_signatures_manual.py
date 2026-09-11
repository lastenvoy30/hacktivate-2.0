from signatures import sign_message, verify_signature

message = "Transfer 500 credits to Bob"
private_key = "alice-secret-key-123"

received = sign_message(message, private_key, num_copies=20)

print("TEST 1 (clean, correct message+key):", verify_signature(message, private_key, received))
print("TEST 2 (wrong key, forger guess):", verify_signature(message, "forger-guessed-key-999", received))
print("TEST 3 (tampered message):", verify_signature("Transfer 5000 credits to Bob", private_key, received))
"""
ZotSpot Test Script
Tests the WebSocket game engine against localhost.
Requires the server to be running locally before executing.
To run, activate the venv, install the requirements.txt if not already installed, and run the following command:
uvicorn main:app --reload
Lastly, run the following command in another terminal:
python test_engine.py
"""

import asyncio
import websockets
import json

WS_URL = "wss://zotspots.onrender.com/ws"

PLAYER_1_ID = "test-player-1"
PLAYER_2_ID = "test-player-2"

# Sample guess coordinates
GUESS_LAT = 1
GUESS_LNG = 1

def log(tag: str, msg: dict):
    print(f"[{tag}] {json.dumps(msg, indent=2)}")


async def test_timeout_no_guesses():
    print("\n=== TEST: Timeout With No Guesses (All 5 Rounds) ===")
    async with websockets.connect(WS_URL) as ws1, websockets.connect(WS_URL) as ws2:
        # Player 1 creates game
        await ws1.send(json.dumps({
            "type": "create_game",
            "mode": "multiplayer",
            "player_id": PLAYER_1_ID
        }))
        data = json.loads(await ws1.recv())
        log("create_game", data)
        game_id = data["game_id"]

        # Player 2 joins
        await ws2.send(json.dumps({
            "type": "join_game",
            "game_id": game_id,
            "player_id": PLAYER_2_ID
        }))
        await ws1.recv()
        await ws2.recv()

        # Player 1 starts game
        await ws1.send(json.dumps({"type": "start_game"}))

        # Round loop - 5 rounds
        for round_num in range(1, 6):
            # Both receive round_start
            msg1 = json.loads(await ws1.recv())
            msg2 = json.loads(await ws2.recv())
            log(f"round {round_num} start (ws1)", msg1)
            log(f"round {round_num} start (ws2)", msg2)

            assert msg1["type"] == "round_start"
            assert msg2["type"] == "round_start"
            assert msg1["round"] == round_num
            assert msg2["round"] == round_num

            # Do NOT send guesses, just wait for the server to timeout the round
            msg1 = json.loads(await ws1.recv())
            msg2 = json.loads(await ws2.recv())
            log(f"round {round_num} results after timeout (ws1)", msg1)
            log(f"round {round_num} results after timeout (ws2)", msg2)

            assert msg1["type"] == "results"
            assert msg2["type"] == "results"
            assert PLAYER_1_ID in msg1["results"]["players"]
            assert PLAYER_2_ID in msg2["results"]["players"]

        # Game over after all 5 rounds
        msg1 = json.loads(await ws1.recv())
        msg2 = json.loads(await ws2.recv())
        log("game_over after 5 rounds no guesses (ws1)", msg1)
        log("game_over after 5 rounds no guesses (ws2)", msg2)

        assert msg1["type"] == "game_over"
        assert msg2["type"] == "game_over"
        assert "winner" in msg1
        assert "final_scores" in msg1
        print("✓ Timeout/no-guess 5-round test passed")


async def test_singleplayer():
    print("\n=== TEST: Singleplayer Game ===")
    async with websockets.connect(WS_URL) as ws:
        # Create game
        await ws.send(json.dumps({
            "type": "create_game",
            "mode": "singleplayer",
            "player_id": PLAYER_1_ID
        }))
        msg = await ws.recv()
        data = json.loads(msg)
        log("create_game", data)
        assert data["type"] == "game_created", "Expected game_created"
        game_id = data["game_id"]

        # Start game
        await ws.send(json.dumps({"type": "start_game"}))

        # Round loop - 5 rounds
        for round_num in range(1, 6):
            msg = await ws.recv()
            data = json.loads(msg)
            log(f"round {round_num} start", data)
            assert data["type"] == "round_start", f"Expected round_start, got {data['type']}"
            assert data["round"] == round_num, f"Expected round {round_num}"

            # Submit a guess
            await ws.send(json.dumps({
                "type": "guess",
                "lat": GUESS_LAT,
                "lng": GUESS_LNG
            }))

            msg = await ws.recv()
            data = json.loads(msg)
            log(f"round {round_num} results", data)
            assert data["type"] == "results", f"Expected results, got {data['type']}"
            assert PLAYER_1_ID in data["results"]["players"], "Player 1 missing from results"

        # Game over
        msg = await ws.recv()
        data = json.loads(msg)
        log("game_over", data)
        assert data["type"] == "game_over", f"Expected game_over, got {data['type']}"
        assert data["winner"] is None, "Singleplayer should have no winner"
        print("✓ Singleplayer test passed")


async def test_multiplayer():
    print("\n=== TEST: Multiplayer Game ===")
    async with websockets.connect(WS_URL) as ws1, websockets.connect(WS_URL) as ws2:
        # Player 1 creates game
        await ws1.send(json.dumps({
            "type": "create_game",
            "mode": "multiplayer",
            "player_id": PLAYER_1_ID
        }))
        msg = await ws1.recv()
        data = json.loads(msg)
        log("create_game", data)
        assert data["type"] == "game_created"
        game_id = data["game_id"]

        # Player 2 joins
        await ws2.send(json.dumps({
            "type": "join_game",
            "game_id": game_id,
            "player_id": PLAYER_2_ID
        }))

        # Both should receive player_joined
        msg1 = await ws1.recv()
        msg2 = await ws2.recv()
        data1 = json.loads(msg1)
        data2 = json.loads(msg2)
        log("player_joined (ws1)", data1)
        log("player_joined (ws2)", data2)
        assert data1["type"] == "player_joined"
        assert data2["type"] == "player_joined"

        # Player 1 starts game
        await ws1.send(json.dumps({"type": "start_game"}))

        # Round loop - 5 rounds
        for round_num in range(1, 6):
            # Both receive round_start
            msg1 = json.loads(await ws1.recv())
            msg2 = json.loads(await ws2.recv())
            log(f"round {round_num} start (ws1)", msg1)
            assert msg1["type"] == "round_start"
            assert msg2["type"] == "round_start"

            # Both players guess
            await ws1.send(json.dumps({
                "type": "guess",
                "lat": GUESS_LAT,
                "lng": GUESS_LNG
            }))
            await ws2.send(json.dumps({
                "type": "guess",
                "lat": GUESS_LAT + 0.001,  # slightly different guess
                "lng": GUESS_LNG + 0.001
            }))

            # Both receive results
            msg1 = json.loads(await ws1.recv())
            msg2 = json.loads(await ws2.recv())
            log(f"round {round_num} results (ws1)", msg1)
            assert msg1["type"] == "results"
            assert PLAYER_1_ID in msg1["results"]["players"]
            assert PLAYER_2_ID in msg1["results"]["players"]

            # Check if game ended early due to a winner
            try:
                potential_end1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=0.1))
                if potential_end1["type"] == "game_over":
                    log("game_over (early)", potential_end1)
                    print("✓ Multiplayer test passed (early win)")
                    return
            except asyncio.TimeoutError:
                pass  # No early game over, continue

        # Game over after all rounds
        msg = json.loads(await ws1.recv())
        log("game_over", msg)
        assert msg["type"] == "game_over"
        assert "winner" in msg
        assert "final_scores" in msg
        print("✓ Multiplayer test passed")


async def test_invalid_join():
    print("\n=== TEST: Invalid Join ===")
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({
            "type": "join_game",
            "game_id": "nonexistent-game-id",
            "player_id": PLAYER_1_ID
        }))
        msg = json.loads(await ws.recv())
        log("invalid join response", msg)
        assert msg["type"] == "error", f"Expected error, got {msg['type']}"
        assert msg["reason"] in ("bad_connection", "no_game")
        print("✓ Invalid join test passed")


async def test_guess_without_game():
    print("\n=== TEST: Guess Without Game ===")
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({
            "type": "guess",
            "lat": GUESS_LAT,
            "lng": GUESS_LNG
        }))
        msg = json.loads(await ws.recv())
        log("guess without game response", msg)
        assert msg["type"] == "error"
        assert msg["reason"] == "no_game"
        print("✓ Guess without game test passed")


async def test_start_without_game():
    print("\n=== TEST: Start Without Game ===")
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"type": "start_game"}))
        msg = json.loads(await ws.recv())
        log("start without game response", msg)
        assert msg["type"] == "error"
        assert msg["reason"] == "no_game"
        print("✓ Start without game test passed")


async def main():
    await test_invalid_join()
    await test_guess_without_game()
    await test_start_without_game()
    await test_timeout_no_guesses()
    await test_singleplayer()
    await test_multiplayer()
    print("\n✓ All tests passed")


if __name__ == "__main__":
    asyncio.run(main())
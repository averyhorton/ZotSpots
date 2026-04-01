# Socket Integration With Engine
The client and the engine communicate with one another through the use of websockets. Both the client and the engine can send and recieve messages. The engine is hosted on Render.

## Server -> Client Messages
Below is the list of messages the server sends to the client for rendering:
- `game_created`: a lobby has been initialized
- `lobby_updated`: a lobby has received updates that need reflection in the backend
- `round_start`: initializes each round of the game
- `results`: returns the results of a round, which includes the round number and the round payload (distances, scores, etc)
- `game_over`: ends a game (and declares a winner if multiplayer), and kills the lobby
- `game_cancelled`: if a lobby is ended prematurely, alert the client
- `error`: a server function failed; can come with many codes
    - `bad_code`: user gave a join code that mapped to no games
    - `bad_connection`: a websocket failed to communicate
    - `critical_failure`: a major error happened during a round; details are provided in the message

## Server <- Client Messages
Below is the list of messages the client sends to the server for processing:
- `create_game`: creates a new lobby for either singleplayer or multiplayer depending on user input
- `join_game`: attempts to join a lobby using a code given by the user
- `start_game`: starts the game loop
- `guess`: submits a guess for a player
- `disconnect`: removes a player from the lobby

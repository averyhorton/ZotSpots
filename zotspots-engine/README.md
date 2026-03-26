# Socket Integration With Engine
The client and the engine communicate with one another through the use of websockets. Both the client and the engine can send and recieve messages. 

## Server -> Client Messages
Below is the list of messages the server sends to the client for rendering:
- `game_created`: a lobby has been initialized
- `round_start`: initializes each round of the game
- `results`: returns the results of a round, which includes the round number and the round payload (distances, scores, etc)
- `game_over`: ends a game (and declares a winner if multiplayer), and kills the lobby
- `game_cancelled`: if a lobby is ended prematurely, alert the client

## Server <- Client Messages
Below is the list of messages the client sends to the server for processing:
- `create_game`: creates a new lobby for either singleplayer or multiplayer depending on user input
- `join_game`: attempts to join a lobby using a code given by the user
- `guess`: submits a guess for a player
- `disconnect`: removes a player from the lobby
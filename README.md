# PetrGuessr (formerly ZotSpots)
PetrGuessr is a fullstack Geoguessr clone focused on UC Irvine and its various campus spots built by Avery Horton, Adam Gans, and Samuel Mallari. Click [this link](https://petrguessr-ucirvine.web.app) to play!

## Features
- 82 campus pictures
- Singleplayer + multiplayer mode (currently supports parties of 2)
- 360 photo viewing

# Developer Details
## Overview
PetrGuessr is a fullstack app hosted on Firebase. The app was built with a Python backend for the game engine, PostgreSQL database for storing all the locations and their geodata, and a Typescript + React (Vite) frontend. Websockets and Python's FastAPI library are used for communication between the frontend and backend. Consult the [sketch docs](https://drive.google.com/file/d/1Rv2CtS-CPIijsnD--I92nr0Y3b0jfEkG/view?usp=drive_link) for more information on architecture outline.

## Beginning Development
Make sure to install all dependencies in requirements.txt. Please update requirements.txt with any and all new packages used in any commits.

We use [Render]([https://dashboard.render.com/select-repo?type=blueprint&noreferrer=true](https://dashboard.render.com/web/srv-d746ta75r7bs73cooi1g/logs?r=1h)) to host the game engine, and [Supabase]([https://supabase.com/dashboard/project/hlckmuidsanicjjdpqbc](https://supabase.com/dashboard/project/hlckmuidsanicjjdpqbc/editor/17541)) to host the locations database. Upon completion of development, make sure all environment variables and source code is sound before hosting on Firebase.

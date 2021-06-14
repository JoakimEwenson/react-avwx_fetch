import "./App.css";
import "tailwindcss/tailwind.css";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import MainPage from "./components/MainPage";

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/">
          <MainPage />
        </Route>
        <Route path="/:urlStation">
          <MainPage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;

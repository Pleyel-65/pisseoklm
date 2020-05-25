import React, { useRef, useState } from 'react';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import {faVolumeUp} from '@fortawesome/free-solid-svg-icons'

enum Category {
  BONJOURS = "bonjours",
  BLAGUES = "blagues",
  AUREVOIRS = "aurevoirs"
}

interface AppState {
  isLoaded: boolean
  phraseGroups: { [c in Category]: string[] }
  error?: Error
  adding: boolean
}

class App extends React.Component {

  state: AppState = {
    isLoaded: false,
    phraseGroups: {
      [Category.BONJOURS]: [],
      [Category.BLAGUES]: [],
      [Category.AUREVOIRS]: []
    },
    adding: false
  }

  async componentDidMount() {
    console.log("did mount")
    try {
      const result = (await (await fetch("/politesse")).json()) as { [c in Category]: string[] }
      this.setState({
        isLoaded: true,
        phraseGroups: result
      })
    }
    catch (error) {
      this.setState({
        isLoaded: false,
        error
      })
    }
  }

  private deletePhrase = (category: Category, phrase: string) => {
    const requestOptions = {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, phrase })
    };
    fetch('/politesse', requestOptions)
      .then(response => response.json())
      .then(data =>
        this.setState((prevState: AppState) => {
          const { phraseGroups } = prevState;
          phraseGroups[category] = prevState.phraseGroups[category].filter(x => x !== phrase)
          return { phraseGroups }
        })
      );
  }

  private addPhrase = (category: Category, phrase: string) => {
    this.setState({adding: true})
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, phrase })
    };
    fetch('/politesse', requestOptions)
      .then(response => response.json())
      .then(data =>
        this.setState((prevState: AppState) => {
          return { phraseGroups: { ...prevState.phraseGroups, [category]: [...prevState.phraseGroups[category], phrase] } }
        })
      )
      .finally(() => {
        this.setState({adding: false})
      }) 
  }

  render() {
    const { error, phraseGroups, isLoaded, adding } = this.state;

    if (error) {
      return <div>{error.message}</div>;
    }

    if (!isLoaded) {
      return <div>loading...</div>
    }

    return (
      <div>
        <ParleBox />
        {
          Object.entries(phraseGroups).map(([category, phrase]) =>
            <Bloc key={category} category={category as Category} phrases={phrase} onDeletePhrase={this.deletePhrase} onAddPhrase={this.addPhrase} adding={adding} />
          )
        }
      </div>
    );
  }
}

interface BlocProps {
  category: Category
  phrases: string[]
  adding: boolean
  onDeletePhrase: (category: Category, phrase: string) => void
  onAddPhrase: (category: Category, phrase: string) => void
}

function ParleBox() {

  const [loading, setLoading] = useState<boolean>(false);
  const textInput = useRef<HTMLInputElement>(null);

  const parle = async () => {

    if (textInput.current === null) {
      return;
    }

    const phrase = textInput.current.value.trim();

    if (phrase.length === 0) {
      return;
    }

    setLoading(true)
    await fetch(`/parle?phrase=${encodeURIComponent(phrase)}`)
    setLoading(false)
  }

  return <div>
    <input type="text" ref={textInput} disabled={loading}></input>
    <button onClick={parle} disabled={loading}>parle</button>
    {
      loading && <span>diction en cours...</span>
    }
  </div>
}


function Bloc(props: BlocProps) {

  const newInput = useRef<HTMLInputElement>(null)

  const add = () => {
    if (newInput.current) {
      const newPhrase = newInput.current.value.trim()
      if (newPhrase.length > 0) {
        props.onAddPhrase(props.category, newInput.current.value)
        newInput.current.value = ""
      }
    }
  }

  return <div>
    <b>{props.category}</b>:
      <ul>
      {props.phrases.map(phrase =>
        <BlocItem key={phrase} phrase={phrase} onClick={() => props.onDeletePhrase(props.category, phrase)} />
      )}
      <li>
        <button onClick={add} disabled={props.adding}>plus</button>
        <span>&nbsp;&nbsp;</span>
        <input type="text" ref={newInput} disabled={props.adding}/>
        {
          props.adding && <span>ajout en cours...</span>
        }
      </li>
    </ul>
  </div>
}

function BlocItem({ phrase, onClick }: { phrase: string, onClick: () => void }) {

  const [loading, setLoading] = useState<boolean>(false);

  const parle = async () => {
    setLoading(true)
    await fetch(`/parle?phrase=${encodeURIComponent(phrase)}`)
    setLoading(false)
  }

  return <li>
    <button onClick={onClick}>moins</button>
    <span>&nbsp;&nbsp;</span>
    {phrase}
    <span>&nbsp;&nbsp;</span>

    <FontAwesomeIcon icon={faVolumeUp} onClick={parle}/>
    {
      loading && <span>diction en cours...</span>
    }
  </li>
}

export default App;

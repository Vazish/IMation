import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Vibration, Button } from 'react-native';
import { Icon } from 'react-native-elements';
import { Camera, Permissions, FileSystem } from 'expo';
var ENV = require('./ENV').env;

export default class App extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      showCamera: false,
      hasCameraPermission: null,
      type: Camera.Constants.Type.back,
      pictureUrl: '',
      isPhoto: false,
      photoId: 1,
      firstText: '',
      firstLang: '',
      finalLang: 'en',
      finalText: '',
    }
  }

  showCamera(){
    if (this.state.hasCameraPermission){
      return (
        <Camera ref={ref => { this.camera = ref; }} style={{ flex: 1, alignSelf: 'stretch'}} type={ this.state.type }>
          <View style={{ flex: 1, flexDirection: 'column', backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Icon reverse name='camera' type='material-community' color='transparent' onPress={() => this.takePicture()} />
          </View>
        </Camera>
      )
    } else if (!this.state.hasCameraPermission) {
      return (
        <Text>Permission not granted</Text>
      )
    } else {
      return (
        <Text>There was some mistake with the request</Text>
      )
    }
  }

  async takePicture() {
    if (this.camera) {
      let photo = await this.camera.takePictureAsync({
        quality: 1.0,
        base64: true,
        exif: true,
      })
      this.setState({
        pictureUrl: photo.uri,
      })
      this.fetchVision(photo.base64);
    }
  }

  fetchVision(imageBase64){
    console.log('FETCHING IMAGE INFORMATION');
    fetch(`https://vision.googleapis.com/v1/images:annotate?key=${ENV.G_TRANSLATE_KEY}`,
    {
      headers: {
        "Content-Type": "application/json"
      },
      method: 'POST',
      body: JSON.stringify({
        "requests": [
          {
            "image": {
              "content": imageBase64,
            },
            "features": [
              {
                "type": "TEXT_DETECTION"
              }
            ]
          }
        ]
      }
      )
    }).then(values => {
      return JSON.parse(values._bodyText)
    }).then(jsonObj => {
      this.fetchTranslate(jsonObj.responses[0].fullTextAnnotation.text, jsonObj.responses[0].fullTextAnnotation.pages[0].property.detectedLanguages[0].languageCode, this.state.finalLang)
    })
    .catch(err => console.log('ERROR', err))
  }

  fetchTranslate(text, sourceLang, finalLang){
    console.log('FETCHING TRANSLATED TEXT');
    fetch(`https://translation.googleapis.com/language/translate/v2?key=${ENV.G_TRANSLATE_KEY}`,
    {
      headers: {
        "Content-Type": "application/json"
      },
      method: 'POST',
      body: JSON.stringify({q: text, target: finalLang, source: sourceLang})
    }).then(values => {
      return JSON.parse(values._bodyText)
    }).then(translation => {
      this.setState({
        finalText: translation.data.translations[0].translatedText,
        firstText: text,
        firstLang: sourceLang,
        showCamera: false,
        isPhoto: true,
      })
    })
    .catch(err => console.log(err))
  }

  showIcons() {
    console.log('STATE', this.state);
    if (this.state.isPhoto){
      return (
      <View style={styles.container}>
        <Image style={{width: 180, height: 240}} source={{uri: this.state.pictureUrl}}/>
        <Text>Source Text (<Text style={{fontWeight: 'bold'}}>{this.state.firstLang}</Text>): {this.state.firstText}</Text>
        <Text>Translated Text (<Text style={{fontWeight: 'bold'}}>{this.state.finalLang}</Text>): {this.state.finalText}</Text>
        <Icon name='camera-retro' type='font-awesome' onPress={() => this.handleIconClick()} />
      </View>
      )
    } else {
      return (<Icon name='camera-retro' type='font-awesome' onPress={() => this.handleIconClick()} />)
    }
  }

  async handleIconClick() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    if (status === 'granted') {
      this.setState({
        hasCameraPermission: true,
        showCamera: true
      })
    } else {
      this.setState({
        hasCameraPermission: false,
      })
    }
  }

  render() {
    return (
      <View style={styles.container}>
        {this.state.showCamera ? this.showCamera() : this.showIcons()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 100,
    color: '#000',
    padding: 10,
    margin: 40
}
});

// Things to see:
// => Storing on local library or create local storage for app itself
// => whether we want to store on a database
// => when to show picture after photo is taken
// => on a related not, make a loading page for this
// => make icons bigger

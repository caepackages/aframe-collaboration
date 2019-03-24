require('aframe')

/* global AFRAME */
if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

  AFRAME.registerComponent('collaboration', {
    dependencies: ['networked-scene'],
    schema: {
      user: {default: 'rettifan'},
      pic: {default: './GPUParticleSimulation/textures/68.jpg'},
      avatarclass: {default: 'avatar'},
      camInfoId: {default: 'camInfo'},
      camInfoTemplate: {default: 'camera ${user}'},
      msgInfoId: {default: 'msgInfo'},
      msgInfoTemplate: {default: '<table><tr><th style ="transform:scale(0.4);background:url(${pic});width: 128px;height: 128px;"></th><th>${message}</tr></th></table>'}   // '[${user}] : ${message}'}
    },
    
    init: function () {
      var el = this.el;
      this.useSharedCamera = false;
      this.handleKeydown = true;
      window.addEventListener('keydown', this.onKeydown.bind(this));
      window.addEventListener('keyup', this.onKeyup.bind(this));
      
      this.connectedClients = [];
      this.followedClientId = undefined;
      document.body.addEventListener('entityCreated', this.onEntityCreated.bind(this) );
      document.body.addEventListener('entityRemoved', this.onEntityRemoved.bind(this) );
      
      document.body.addEventListener('clientConnected', function (evt) {
        console.log('clientConnected:', evt);
      });
      
      NAF.connection.subscribeToDataChannel('modelChanged', (id, dataType, data) => {console.log("reload model now");});
      NAF.connection.subscribeToDataChannel('modelChat', 
        (id, dataType, data) => {
          console.log("[" + data.user + "] : " + data.message);
          var msgInfoEl = document.getElementById(this.data.msgInfoId);
          var newMsg = msgInfoEl.cloneNode(true);
          var user = data.user;
          var pic = data.pic
          var message = data.message;
          newMsg.innerHTML = eval('`' + this.data.msgInfoTemplate + '`');
          msgInfoEl.parentNode.replaceChild(newMsg, msgInfoEl);          
        });
    },
 
    onEntityCreated: function (evt) {
      if (evt.detail.el.hasAttribute('id') && evt.detail.el.hasAttribute('class') && evt.detail.el.getAttribute("class").split(" ").indexOf(this.data.avatarclass) > -1 ){
        var id = evt.detail.el.attributes.id.nodeValue;
        this.connectedClients.push(id)
        
        if (this.followedClientId === undefined) {
          this.followedClientId = id;
        }
      }
    },         
    
    onEntityRemoved: function (evt) {  
      var id = 'naf-' + evt.detail.networkId;
 
      var index = this.connectedClients.indexOf(id);
      if (index > -1) {
          this.connectedClients.splice(index, 1);
      }
      
      if (id === this.followedClientId) {
        this.followedClientId = undefined;
        this.releaseClientCamera();
      }
    },   

    nextClient: function () {
      if (this.useSharedCamera === true) {
        var i = this.connectedClients.indexOf(this.followedClientId);
        i += 1;
        if (i === this.connectedClients.length) {
          i = 0;
        }
        this.followedClientId = this.connectedClients[i];
        this.followClient(this.followedClientId);
      }
    },
    
    releaseClientCamera: function () {  
        this.modelCamera.setAttribute('camera', 'active:true');
    }, 
    
    followClient: function (clientId) {
      
      var i = this.connectedClients.indexOf(clientId);
      
      if (i > -1) {
        
        // find element
        var avatarEl = document.getElementById(clientId);
        
        var sharedCamEl = avatarEl.querySelector("[camera]");
        
        if (sharedCamEl) {
          sharedCamEl.setAttribute('camera', 'active:true');
          var cameraInfoEl = document.getElementById(this.data.camInfoId);
          var newCam = cameraInfoEl.cloneNode(true); 
          var client = this.followedClientId;
          var user = this.getUser(client);
          newCam.innerHTML = eval('`' + this.data.camInfoTemplate + '`');
          cameraInfoEl.parentNode.replaceChild(newCam, cameraInfoEl);
        } else {
          console.log("failed to find avatar in DOM")
        }
      } else {
        console.log("invalid client id: " + clientId)
      }
    },  
    
    update: function () {
      this.modelCamera = this.el.sceneEl.systems.camera.activeCameraEl;
    },

    onKeyup: function (evt) {
        this.handleKeydown = true;
    },    
    
    onKeydown: function (evt) {
      
        if (this.handleKeydown) {
          
          this.handleKeydown = false;
            switch(evt.key) {
              case 'x':
                // toggle follow shared camera
                this.useSharedCamera = !this.useSharedCamera;
                if (this.useSharedCamera === true) {
                  this.followClient(this.followedClientId);
                } else {
                  this.removeSharedCamera();                
                  }
                break;
              case 'n':
                this.nextClient();
                break;     
              case 'c':
                var message = prompt("Enter a message to all connected clients", "Hi, I'm " + this.data.user);
                
                if (message != null) {
                  this.sendModelChatMessage({'user': this.data.user,'message': message, 'pic': this.data.pic})
                }
                break;                  
            }
        }
    },

    sendModelChatMessage: function(data) {
      NAF.connection.broadcastData('modelChat', data);
    },  
    
    getUser: function (clientId) {
        return document.querySelector("[id=" + clientId + "].avatar a-entity[text]").getAttribute("text").value;
    },     
    
    removeSharedCamera: function () {
        this.modelCamera.setAttribute('camera', 'active:true');
        var cameraInfoEl = document.getElementById(this.data.camInfoId).innerHTML = "";
    },    
    
    remove: function () {
    
    },
        
    tick: function (time, timeDelta) {

    }

  }); 


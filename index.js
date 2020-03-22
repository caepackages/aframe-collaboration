require('aframe')

/* global AFRAME */
if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

  AFRAME.registerComponent('collaboration', {
    dependencies: ['networked-scene'],
    schema: {
      user: {default: 'default'},
      pic: {default: ''},
      avatarclass: {default: 'avatar'}
    },
	
    init: function () {
      var el = this.el;
      this.useSharedCamera = false;
      this.handleKeydown = true; 
      this.connectedClients = [];
      this.followedClientId = undefined;
      document.body.addEventListener('entityCreated', this.onEntityCreated.bind(this) );
      document.body.addEventListener('entityRemoved', this.onEntityRemoved.bind(this) );

      NAF.connection.subscribeToDataChannel('modelChat', 
        (id, dataType, data) => {
		  this.el.emit('modelChatMessage', data);	  
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
		this.followCamera();
      }
    },
    
    releaseClientCamera: function () {  
        this.modelCamera.setAttribute('camera', 'active:true');
    }, 

    followCamera: function () {
      
      var i = this.connectedClients.indexOf(this.followedClientId);
      
      if (i > -1) {
        
        // find element
        var avatarEl = document.getElementById(this.followedClientId);
        
        var sharedCamEl = avatarEl.querySelector("[camera]");
        
        if (sharedCamEl) {
          sharedCamEl.setAttribute('camera', 'active:true');
          var client = this.followedClientId;
          var user = this.getUser(client);
        } else {
          console.log("failed to find avatar in DOM")
        }
      } else {
        console.log("invalid client id: " + this.followedClientId)
      }
    },  	

    update: function () {
      this.modelCamera = this.el.sceneEl.systems.camera.activeCameraEl;
    },

    sendModelChatMessage: function(message) {
		var data = {'user': this.data.user, 'message': message};
		NAF.connection.broadcastDataGuaranteed('modelChat', data);
    },  
    
    getUser: function (clientId) {
        return document.querySelector("[id=" + clientId + "].avatar a-entity[text]").getAttribute("text").value;
    },

    unfollowCamera: function () {
        this.modelCamera.setAttribute('camera', 'active:true');
    },    
}); 

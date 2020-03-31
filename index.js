require('aframe')

/* global AFRAME */
if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

  AFRAME.registerComponent('collaboration', {
    dependencies: ['networked-scene'],
    schema: {
      user: {default: ''},
      avatarclass: {default: 'avatar'}
    },
	
    init: function () {
	  if (this.data.user.length === 0 ) {
		  var urlPar = AFRAME.utils.getUrlParameter('user');
		  if (urlPar.length > 0) {
			  this.data.user = urlPar;
		  } else {
			  this.data.user = 'default';
		  }
	  }

      var el = this.el;
      this.useSharedCamera = false;
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
        this.unfollowCamera();
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

    followCamera: function () {
      
      var i = this.connectedClients.indexOf(this.followedClientId);
      
      if (i > -1) {
        
        // find element
        var avatarEl = document.getElementById(this.followedClientId);
        
        var sharedCamEl = avatarEl.querySelector("[camera]");
        
        if (sharedCamEl) {
          // activate remote-avatar
          var remoteAvatars = document.querySelectorAll('[remote-avatar]');
          for (var i = 0; i < remoteAvatars.length; i+= 1) {
			remoteAvatars[i].setAttribute("remote-avatar", "active", false);
          }			

          sharedCamEl.setAttribute('camera', 'active:true');
		  this.useSharedCamera = true;
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
		// activate remote-avatar
		var remoteAvatars = document.querySelectorAll('[remote-avatar]');
		for (var i = 0; i < remoteAvatars.length; i += 1) {
			remoteAvatars[i].setAttribute("remote-avatar", "active", true)
		}		
		this.useSharedCamera = false;
        this.modelCamera.setAttribute('camera', 'active:true');
    },    
}); 

AFRAME.registerComponent('remote-avatar', {
    schema: {
		active : {default: true}
    },
	
    init: function () {
		this.updateFunction = AFRAME.utils.throttle(this.syncAvatar, 25, this);
    },
	
  syncAvatar: function () {
    if ( AFRAME.hasOwnProperty('scenes')) {
		if (AFRAME.scenes.length > 0) {
			var wp = new AFRAME.THREE.Vector3();
			var wq = new AFRAME.THREE.Quaternion();
			var ws = new AFRAME.THREE.Vector3();		
			var wQuat = new AFRAME.THREE.Quaternion();		
			var wPos = new AFRAME.THREE.Vector3();		
			var scene = AFRAME.scenes[0];
			var camera = scene.camera;
			camera.updateMatrixWorld(true);
			var wm = camera.matrixWorld;
			wm.decompose(wp, wq, ws);
			camera.getWorldPosition(wPos);
			camera.getWorldQuaternion(wQuat);
			var eul = new AFRAME.THREE.Euler().setFromQuaternion(wq, 'YXZ');
			var angles = new AFRAME.THREE.Vector3(THREE.Math.radToDeg(eul.x), THREE.Math.radToDeg(eul.y), THREE.Math.radToDeg(eul.z));
			this.el.setAttribute('position', wp);
			this.el.setAttribute('rotation', angles);
	  }
    }
  },

  tick: function(time, delta) {
	if (this.data.active === true) {
		this.updateFunction();
	}
  },
});

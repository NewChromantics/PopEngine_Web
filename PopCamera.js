
Pop.Camera = function()
{
	this.FovVertical = 45;
	
	this.Position = [ 0,1,20 ];
	this.LookAt = [ 0,0,0 ];
	
	this.NearDistance = 0.01;
	this.FarDistance = 100;
	
	this.GetOpencvProjectionMatrix = function(ViewRect)
	{
		/*
		 Matrix[0] =
		 |fx  0 cx|
		 |0  fy cy|
		 |0  0   1|
		*/
		
		//	from calibration
		//let w = 363.30 * 2;
		//let h = 364.19 * 2;
		//let cx = 400;
		//let cy = 400;
		let w = ViewRect[2];
		let h = ViewRect[3];
		let cx = w/2;
		let cy = h/2;
		
		let Matrix =
		[
			w/2,
		 	0,
		 	cx,
		 
		 	0,
			h/2,
			cy,
		 
		 	0,
		 	0,
		 	1
		];
		return Matrix;
	}
	
	this.GetProjectionMatrix = function(ViewRect)
	{
		let Aspect = ViewRect[2] / ViewRect[3];
		
		//	lengths should be in pixels
		let FocalLengthVertical = 1.0 / Math.tan( Math.radians(this.FovVertical) / 2);
		let FocalLengthHorizontal = FocalLengthVertical / Aspect;
		
		let nf = 1 / (this.NearDistance - this.FarDistance);
		let LensCenterX = 0;
		let LensCenterY = 0;

		let Matrix = [];
		Matrix[0] = FocalLengthHorizontal;
		Matrix[1] = 0;
		Matrix[2] = LensCenterX;
		Matrix[3] = 0;
		
		Matrix[4] = 0;
		Matrix[5] = FocalLengthVertical;
		Matrix[6] = LensCenterY;
		Matrix[7] = 0;
		
		Matrix[8] = 0;
		Matrix[9] = 0;
		Matrix[10] = (this.FarDistance + this.NearDistance) * nf;
		Matrix[11] = -1;
		
		Matrix[12] = 0;
		Matrix[13] = 0;
		Matrix[14] = 2 * this.FarDistance * this.NearDistance * nf;
		Matrix[15] = 0;
		
		return Matrix;
	}
	
	this.GetWorldToCameraMatrix = function()
	{
		//	https://stackoverflow.com/questions/349050/calculating-a-lookat-matrix
		let Up = [0,1,0];
		let Forward = Math.Subtract3( this.LookAt, this.Position );
		let zaxis = Math.Normalise3( Forward );
		let Right = Math.Cross3( Up, zaxis);
		let xaxis = Math.Normalise3( Right );
		let yaxis = Math.Cross3( zaxis, xaxis );
		let MinusPos = Math.Subtract3( [0,0,0], this.Position );
		let tx = -Math.Dot3( xaxis, MinusPos );
		let ty = -Math.Dot3( yaxis, MinusPos );
		let tz = -Math.Dot3( zaxis, MinusPos );

		let Matrix =
		[
		 xaxis[0], yaxis[0], zaxis[0], 0,
		 xaxis[1], yaxis[1], zaxis[1], 0,
		 xaxis[2], yaxis[2], zaxis[2], 0,
		 tx, ty, tz, 1
		];
		return Matrix;
	}
	
	this.GetPitchYawRollDistance = function()
	{
		//	dir from lookat to position (orbit, not first person)
		let Dir = Math.Subtract3( this.Position, this.LookAt );
		let Distance = Math.Length3( Dir );
		//Pop.Debug("Distance = ",Distance,Dir);
		Dir = Math.Normalise3( Dir );
		
		let Yaw = Math.RadToDeg( Math.atan2( Dir[0], Dir[2] ) );
		let Pitch = Math.RadToDeg( Math.asin(-Dir[1]) );
		let Roll = 0;
		
		return [Pitch,Yaw,Roll,Distance];
	}
	
	this.SetOrbit = function(Pitch,Yaw,Roll,Distance)
	{
		let Pitchr = Math.radians(Pitch);
		let Yawr = Math.radians(Yaw);
		Pop.Debug("SetOrbit()", ...arguments );
		Pop.Debug("Pitch = "+Pitch);
		
		let Deltax = Math.sin(Yawr) * Math.cos(Pitchr);
		let Deltay = -Math.sin(Pitchr);
		let Deltaz = Math.cos(Yawr) * Math.cos(Pitchr);
		Deltax *= Distance;
		Deltay *= Distance;
		Deltaz *= Distance;
		
		Pop.Debug( "SetOrbit deltas", Deltax, Deltay, Deltaz );
		this.Position[0] = this.LookAt[0] + Deltax;
		this.Position[1] = this.LookAt[1] + Deltay;
		this.Position[2] = this.LookAt[2] + Deltaz;
		
	}
	
	this.OnCameraOrbit = function(x,y,z,FirstClick)
	{
		//	remap input from xy to yaw, pitch
		let yxz = [y,-x,z];
		x = yxz[0];
		y = yxz[1];
		z = yxz[2];
		
		if ( FirstClick )
		{
			this.Start_OrbitPyrd = this.GetPitchYawRollDistance();
			//Pop.Debug("this.Start_OrbitPyrd",this.Start_OrbitPyrd);
			this.Last_OrbitPos = [x,y,z];
		}
		
		let Deltax = this.Last_OrbitPos[0] - x;
		let Deltay = this.Last_OrbitPos[1] - y;
		let Deltaz = this.Last_OrbitPos[2] - z;
	
		Deltax *= 0.1;
		Deltay *= 0.1;
		Deltaz *= 0.1;

		let NewPitch = this.Start_OrbitPyrd[0] + Deltax;
		let NewYaw = this.Start_OrbitPyrd[1] + Deltay;
		let NewRoll = this.Start_OrbitPyrd[2] + Deltaz;
		let NewDistance = this.Start_OrbitPyrd[3];
		
		this.SetOrbit( NewPitch, NewYaw, NewRoll, NewDistance );
	}
	
	this.OnCameraPan = function(x,y,z,FirstClick)
	{
		if ( FirstClick )
			this.LastPos_PanPos = [x,y,z];
		
		let Deltax = this.LastPos_PanPos[0] - x;
		let Deltay = this.LastPos_PanPos[1] - y;
		let Deltaz = this.LastPos_PanPos[2] - z;
		this.Position[0] += Deltax * 0.01
		this.Position[1] -= Deltay * 0.01
		this.Position[2] += Deltaz * 0.01
		
		this.LastPos_PanPos = [x,y,z];
	}
	
	this.OnLookAtPan = function(x,y,z,FirstClick)
	{
		if ( FirstClick )
			this.LastPos_PanPos = [x,y,z];
		
		let Deltax = this.LastPos_PanPos[0] - x;
		let Deltay = this.LastPos_PanPos[1] - y;
		let Deltaz = this.LastPos_PanPos[2] - z;
		this.Position[0] += Deltax * 0.01
		this.Position[1] -= Deltay * 0.01
		this.Position[2] += Deltaz * 0.01
		
		this.LastPos_PanPos = [x,y,z];
	}
	
	
	
	this.OnCameraZoom = function(x,y,FirstClick)
	{
		Pop.Debug("OnCameraZoom deprecated, pass z to CameraPan");
		
		if ( FirstClick )
			this.LastPosZoomPos = [x,y];
		
		let Deltax = this.LastPosZoomPos[0] - x;
		let Deltay = this.LastPosZoomPos[1] - y;
		//this.Position[0] -= Deltax * 0.01
		this.Position[2] -= Deltay * 0.01
		
		this.LastPosZoomPos = [x,y];
	}
	
}


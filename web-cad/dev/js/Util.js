com.hc.dev={};com.hc.dev.util={};
//Get the member information of a object
com.hc.dev.util.getMembers=function(obj){
	var ms='<h3>Member infomation of \''+obj+'\'</h3>';
	for(var m in obj){
		ms+='\n'+m+':'+obj[m]+'<br />';
	}
	return ms;
};

com.hc.dev.util.Monitor=function(e){
	var m=e;
	this.append=function(info){
		m.innerHTML+=info+"<hr />";
	};
	this.display=function(info){
		m.innerHTML=info;
	};
};
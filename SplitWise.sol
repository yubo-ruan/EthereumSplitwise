pragma solidity ^0.6.6;


contract Splitwise {

    mapping (address => mapping(address => uint32)) IOU;             //IOU[debtor][creditor]
    mapping (address => uint32) totalOwed; 
    event new_IOU(
        address indexed debtor,
        address indexed creditor,
        uint32 amount
        );

    
    function add_IOU (address creditor, uint32 amount) external {
        IOU[msg.sender][creditor] += amount;
        totalOwed[msg.sender] += amount;
        emit new_IOU(msg.sender,creditor,amount);
    }
    
    function lookup(address debtor, address creditor) external view returns (uint32 ret){
        return IOU[debtor][creditor];
    }
    
    function viewTotalOwed(address debtor) external view returns (uint32 ret){
        return totalOwed[debtor];
    }

    function resolveCycle (address[] calldata cycle, uint32 _min) external returns (bool ret){
        require(checkCycle(cycle,_min),"either cycle addresse is or min value is wrong");
        for (uint i = 0; i < cycle.length-1; i++) {
            IOU[cycle[i]][cycle[i+1]] -= _min;
            totalOwed[cycle[i]] -= _min;
        }    
        return true;
    }
        
    
    function checkCycle (address[] memory cycle, uint32 _min) private view returns (bool ret) {
        uint32 min = 0xFFFFFFFF;
        
        for (uint i = 0; i < cycle.length-1; i++) {
            uint32 val = IOU[cycle[i]][cycle[i+1]];
            if(val == 0){
                return false; 
            }
            if(val < min){
                min = val;
            }
        }
        
        if(_min != min || cycle[0] != cycle[cycle.length-1]){        // if min is wrong and cycle doesn't connect to the begining
            return false;
        }
        return true;
    }

}


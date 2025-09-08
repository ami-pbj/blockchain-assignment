// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {

    constructor() Ownable(msg.sender) {}

    // roles
    enum Role { None, Client, Provider, Admin }
    mapping(address => Role) public roles;

    // service states
    enum ServiceState { Created, Assigned, Funded, Delivered, Approved, Disputed, Resolved }

    struct Service {
        uint256 id;
        address client;
        address provider;
        uint256 price;
        ServiceState state;
        string description;
        string deliveryDescription;
    }

    struct Application {
        address provider;
        uint256 serviceId;
        string proposal;
        uint256 price; 
        bool accepted;
    }

    uint256 public nextServiceId;
    mapping(uint256 => Service) public services;
    mapping(uint256 => Application[]) public applications;
    mapping(address => uint256[]) public providerApplications;

    
    uint256[] public disputedServiceIds;

    // events
    event ServiceCreated(uint256 indexed serviceId, address indexed client, string description);
    event ServiceFunded(uint256 indexed serviceId, uint256 amount);
    event ProviderAssigned(uint256 indexed serviceId, address indexed provider, uint256 price);
    event ServiceDelivered(uint256 indexed serviceId, string deliveryDescription);
    event ServiceApproved(uint256 indexed serviceId);
    event ServiceDisputed(uint256 indexed serviceId);
    event ServiceResolved(uint256 indexed serviceId, address resolver, bool approved);

    event ApplicationCreated(uint256 indexed serviceId, address indexed provider, string proposal, uint256 price);
    event ApplicationAccepted(uint256 indexed serviceId, address indexed provider, uint256 price);

    // modifiers
    modifier onlyRole(Role _role) {
        require(roles[msg.sender] == _role, "Unauthorized role");
        _;
    }

    modifier inState(uint256 _serviceId, ServiceState _state) {
        require(services[_serviceId].state == _state, "Invalid state for this action");
        _;
    }

    // role management
    function setRole(address user, Role role) external onlyOwner {
        if (user == owner()) {
            require(roles[user] == Role.None, "Cannot change role of the contract owner");
        }
        roles[user] = role;
    }

    // service functions
    function createService(string memory _description) external onlyRole(Role.Client) {
        services[nextServiceId] = Service({
            id: nextServiceId,
            client: msg.sender,
            provider: address(0),
            price: 0, // no price yet
            state: ServiceState.Created,
            description: _description,
            deliveryDescription: ""
        });

        emit ServiceCreated(nextServiceId, msg.sender, _description);
        nextServiceId++;
    }

    function applyForService(uint256 _serviceId, string memory _proposal, uint256 _price) 
        external 
        onlyRole(Role.Provider) 
        inState(_serviceId, ServiceState.Created) 
    {
        applications[_serviceId].push(Application({
            provider: msg.sender,
            serviceId: _serviceId,
            proposal: _proposal,
            price: _price,
            accepted: false
        }));
        
        providerApplications[msg.sender].push(_serviceId);
        emit ApplicationCreated(_serviceId, msg.sender, _proposal, _price);
    }

    function acceptApplication(uint256 _serviceId, uint256 _applicationIndex) 
        external 
        onlyRole(Role.Client) 
        inState(_serviceId, ServiceState.Created) 
    {
        require(services[_serviceId].client == msg.sender, "Not the service client");
        require(_applicationIndex < applications[_serviceId].length, "Invalid application");
        
        Application storage application = applications[_serviceId][_applicationIndex];
        require(!application.accepted, "Application already accepted");
        require(roles[application.provider] == Role.Provider, "Applicant is not a provider");
        
        application.accepted = true;
        services[_serviceId].provider = application.provider;
        services[_serviceId].price = application.price; 
        services[_serviceId].state = ServiceState.Assigned;
        
        emit ApplicationAccepted(_serviceId, application.provider, application.price);
        emit ProviderAssigned(_serviceId, application.provider, application.price);
    }

    function fundService(uint256 _serviceId) external payable 
        onlyRole(Role.Client) 
        inState(_serviceId, ServiceState.Assigned)
    {
        require(msg.value == services[_serviceId].price, "Incorrect ETH amount");
        require(services[_serviceId].client == msg.sender, "Not the service client");
        services[_serviceId].state = ServiceState.Funded;

        emit ServiceFunded(_serviceId, msg.value);
    }

    // Added deliveryDescription parameter
    function deliverService(uint256 _serviceId, string memory _deliveryDescription) external 
        onlyRole(Role.Provider) 
        inState(_serviceId, ServiceState.Funded)
    {
        require(services[_serviceId].provider == msg.sender, "You are not assigned to this service");
        require(bytes(_deliveryDescription).length > 0, "Delivery description required"); // VALIDATION
        
        services[_serviceId].state = ServiceState.Delivered;
        services[_serviceId].deliveryDescription = _deliveryDescription; 

        emit ServiceDelivered(_serviceId, _deliveryDescription);
    }

    function approveService(uint256 _serviceId) external onlyRole(Role.Client) inState(_serviceId, ServiceState.Delivered) {
        require(services[_serviceId].client == msg.sender, "You are not the client");
        services[_serviceId].state = ServiceState.Approved;

        // transferring the ETH to the provider
        payable(services[_serviceId].provider).transfer(services[_serviceId].price);

        emit ServiceApproved(_serviceId);
    }

    function disputeService(uint256 _serviceId) external onlyRole(Role.Client) inState(_serviceId, ServiceState.Delivered) {
        require(services[_serviceId].client == msg.sender, "You are not the client");
        services[_serviceId].state = ServiceState.Disputed;
        
        // Add to disputed services list for admin
        disputedServiceIds.push(_serviceId);

        emit ServiceDisputed(_serviceId);
    }

    function resolveDispute(uint256 _serviceId, bool _approve) external onlyRole(Role.Admin) inState(_serviceId, ServiceState.Disputed) {
        if (_approve) {
            services[_serviceId].state = ServiceState.Approved;
            payable(services[_serviceId].provider).transfer(services[_serviceId].price);
        } else {
            services[_serviceId].state = ServiceState.Resolved; // rejected, refund client
            payable(services[_serviceId].client).transfer(services[_serviceId].price);
        }

        // Remove from disputed services list
        for (uint256 i = 0; i < disputedServiceIds.length; i++) {
            if (disputedServiceIds[i] == _serviceId) {
                disputedServiceIds[i] = disputedServiceIds[disputedServiceIds.length - 1];
                disputedServiceIds.pop();
                break;
            }
        }

        emit ServiceResolved(_serviceId, msg.sender, _approve);
    }

    // Get disputed services for admin dashboard
    function getDisputedServices() external view returns (Service[] memory) {
        Service[] memory disputedServices = new Service[](disputedServiceIds.length);
        
        for (uint256 i = 0; i < disputedServiceIds.length; i++) {
            disputedServices[i] = services[disputedServiceIds[i]];
        }
        
        return disputedServices;
    }

    // View functions
    function getApplicationCount(uint256 _serviceId) external view returns (uint256) {
        return applications[_serviceId].length;
    }

    function getApplication(uint256 _serviceId, uint256 _index) external view returns (Application memory) {
        require(_index < applications[_serviceId].length, "Invalid application index");
        return applications[_serviceId][_index];
    }

    function getProviderApplications(address _provider) external view returns (uint256[] memory) {
        return providerApplications[_provider];
    }

    function getFundedServices() external view returns (Service[] memory) {
        Service[] memory fundedServices = new Service[](nextServiceId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextServiceId; i++) {
            if (services[i].state == ServiceState.Funded) {
                fundedServices[count] = services[i];
                count++;
            }
        }
        
        assembly {
            mstore(fundedServices, count)
        }
        
        return fundedServices;
    }

    function getOpenServices() external view returns (Service[] memory) {
        Service[] memory openServices = new Service[](nextServiceId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextServiceId; i++) {
            if (services[i].state == ServiceState.Created) {
                openServices[count] = services[i];
                count++;
            }
        }
        
        assembly {
            mstore(openServices, count)
        }
        
        return openServices;
    }

    function getService(uint256 _serviceId) external view returns (Service memory) {
        return services[_serviceId];
    }
}
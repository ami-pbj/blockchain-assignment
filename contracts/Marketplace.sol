// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {

    // adding a constructor to pass msg.sender to Ownable
    constructor() Ownable(msg.sender) {}

    // roles
    enum Role { None, Client, Provider, Admin }

    mapping(address => Role) public roles;

    // service states
    enum ServiceState { Created, Funded, Assigned, Delivered, Approved, Disputed, Resolved }

    struct Service {
        uint256 id;
        address client;
        address provider;
        uint256 price;
        ServiceState state;
        string description;
    }

    uint256 public nextServiceId;
    mapping(uint256 => Service) public services;

    // events
    event ServiceCreated(uint256 indexed serviceId, address indexed client, string description);
    event ServiceFunded(uint256 indexed serviceId, uint256 amount);
    event ProviderAssigned(uint256 indexed serviceId, address indexed provider);
    event ServiceDelivered(uint256 indexed serviceId);
    event ServiceApproved(uint256 indexed serviceId);
    event ServiceDisputed(uint256 indexed serviceId);
    event ServiceResolved(uint256 indexed serviceId, address resolver, bool approved);

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
        roles[user] = role;
    }

    // service functions
    function createService(string memory _description, uint256 _price) external onlyRole(Role.Client) {
        services[nextServiceId] = Service({
            id: nextServiceId,
            client: msg.sender,
            provider: address(0),
            price: _price,
            state: ServiceState.Created,
            description: _description
        });

        emit ServiceCreated(nextServiceId, msg.sender, _description);
        nextServiceId++;
    }

    function fundService(uint256 _serviceId) external payable onlyRole(Role.Client) inState(_serviceId, ServiceState.Created) {
        require(msg.value == services[_serviceId].price, "Incorrect ETH amount");
        services[_serviceId].state = ServiceState.Funded;

        emit ServiceFunded(_serviceId, msg.value);
    }

    function assignProvider(uint256 _serviceId, address _provider) external onlyRole(Role.Client) inState(_serviceId, ServiceState.Funded) {
        require(roles[_provider] == Role.Provider, "Assigned address is not a provider");
        services[_serviceId].provider = _provider;
        services[_serviceId].state = ServiceState.Assigned;

        emit ProviderAssigned(_serviceId, _provider);
    }

    function deliverService(uint256 _serviceId) external onlyRole(Role.Provider) inState(_serviceId, ServiceState.Assigned) {
        require(services[_serviceId].provider == msg.sender, "You are not assigned to this service");
        services[_serviceId].state = ServiceState.Delivered;

        emit ServiceDelivered(_serviceId);
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

        emit ServiceResolved(_serviceId, msg.sender, _approve);
    }

    // helper functions
    function getService(uint256 _serviceId) external view returns (Service memory) {
        return services[_serviceId];
    }
}
